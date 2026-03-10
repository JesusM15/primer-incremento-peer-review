#!/usr/bin/env python3
"""
proxy-server.py
Sirve el frontend estático + proxea las rutas de API al backend Node.js.
Mejoras Lighthouse: Gzip, Cache-Control, cabeceras de seguridad.
"""

import gzip
import http.server
import mimetypes
import os
import socketserver
import urllib.error
import urllib.request

BACKEND = 'http://localhost:3001'

# ── Tipos de archivo que se comprimen con Gzip ────────────────────────────────
COMPRESSIBLE = {
    'text/html', 'text/css', 'text/javascript', 'application/javascript',
    'application/json', 'image/svg+xml', 'text/plain', 'text/xml',
    'application/xml', 'application/manifest+json',
}

# ── TTL de caché por tipo ─────────────────────────────────────────────────────
CACHE_TTL = {
    'text/html':              'no-cache',           # siempre revalidar HTML
    'application/javascript': 'public, max-age=86400',   # JS → 1 día
    'text/javascript':        'public, max-age=86400',
    'text/css':               'public, max-age=86400',   # CSS → 1 día
    'image/svg+xml':          'public, max-age=604800',  # SVG → 7 días
    'image/png':              'public, max-age=604800',
    'application/json':       'no-cache',
    'application/manifest+json': 'no-cache',
}

SECURITY_HEADERS = {
    'X-Content-Type-Options':     'nosniff',
    'X-Frame-Options':            'SAMEORIGIN',
    'Referrer-Policy':            'strict-origin-when-cross-origin',
    'Cross-Origin-Opener-Policy': 'same-origin',
    # CSP omitida intencionalmente en dev: unsafe-inline penaliza más que no tener CSP
}



class ProxyHandler(http.server.SimpleHTTPRequestHandler):

    API_PATHS = ('/articles', '/sync', '/ping', '/health', '/comments', '/users')

    # ── Helpers ───────────────────────────────────────────────────────────────

    def _is_api(self):
        return any(self.path.startswith(p) for p in self.API_PATHS)

    def _send_security_headers(self):
        for k, v in SECURITY_HEADERS.items():
            self.send_header(k, v)

    def _gzip_body(self, body, content_type):
        """Comprime el body si el cliente acepta gzip y el tipo es compresible."""
        accept = self.headers.get('Accept-Encoding', '')
        if 'gzip' in accept and content_type.split(';')[0].strip() in COMPRESSIBLE:
            compressed = gzip.compress(body, compresslevel=6)
            return compressed, True
        return body, False

    def _cache_header(self, content_type):
        base = content_type.split(';')[0].strip()
        return CACHE_TTL.get(base, 'no-cache')

    # ── Proxy hacia el backend Node.js ────────────────────────────────────────

    def _proxy(self, method):
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length) if content_length else None

            req = urllib.request.Request(
                f'{BACKEND}{self.path}',
                data=body,
                method=method
            )
            req.add_header('Content-Type', self.headers.get('Content-Type', 'application/json'))

            response  = urllib.request.urlopen(req)
            data      = response.read()
            ct        = 'application/json'

            # Para HEAD no comprimir ni enviar body (viola la especificación HTTP)
            is_head = method.upper() == 'HEAD'
            if not is_head:
                data, compressed = self._gzip_body(data, ct)
            else:
                compressed = False

            self.send_response(response.getcode())
            self.send_header('Content-Type', ct)
            self.send_header('Cache-Control', 'no-cache')
            self.send_header('Access-Control-Allow-Origin', '*')
            if compressed:
                self.send_header('Content-Encoding', 'gzip')
            self.send_header('Content-Length', str(len(data)))
            self._send_security_headers()
            self.end_headers()

            # HEAD → solo cabeceras, sin body
            if not is_head:
                self.wfile.write(data)

        except urllib.error.HTTPError as e:
            err_body = e.read() if method.upper() != 'HEAD' else b''
            self.send_response(e.code)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Content-Length', str(len(err_body)))
            self.end_headers()
            if method.upper() != 'HEAD':
                self.wfile.write(err_body)
        except (ConnectionAbortedError, BrokenPipeError):
            # El cliente cerró la conexión antes de recibir la respuesta.
            # Esto es normal en móviles y en conexiones idle — no es un error.
            pass

        except Exception:
            self.send_response(503)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Content-Length', '0')
            self.end_headers()

    # ── Servido de archivos estáticos con compresión y caché ─────────────────

    def send_response_only(self, code, message=None):
        super().send_response_only(code, message)

    def send_head(self):
        """Sobrescribe send_head de SimpleHTTPRequestHandler para inyectar cabeceras."""
        path = self.translate_path(self.path)
        if os.path.isdir(path):
            return super().send_head()

        ext        = os.path.splitext(path)[1].lower()
        ct, _      = mimetypes.guess_type(path)
        ct         = ct or 'application/octet-stream'

        try:
            with open(path, 'rb') as f:
                body = f.read()
        except OSError:
            self.send_error(404, 'File not found')
            return None

        body, compressed = self._gzip_body(body, ct)

        self.send_response(200)
        self.send_header('Content-Type', ct)
        self.send_header('Cache-Control', self._cache_header(ct))
        self._send_security_headers()
        if compressed:
            self.send_header('Content-Encoding', 'gzip')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)
        return None   # ya escribimos el body, SimpleHTTPRequestHandler no debe hacerlo

    # ── Métodos HTTP ──────────────────────────────────────────────────────────

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_GET(self):
        if self._is_api():
            self._proxy('GET')
        else:
            # Servir index.html directamente en la raíz — evita redirect 301
            # que el Service Worker no puede cachear
            if self.path == '/':
                self.path = '/index.html'
            self.send_head()

    def do_POST(self):
        if self._is_api(): self._proxy('POST')

    def do_PUT(self):
        if self._is_api(): self._proxy('PUT')

    def do_DELETE(self):
        if self._is_api(): self._proxy('DELETE')

    def do_HEAD(self):
        if self._is_api(): self._proxy('HEAD')
        else: super().do_HEAD()

    def log_message(self, format, *args):
        print(f'[{self.address_string()}] {format % args}')


if __name__ == '__main__':
    PORT = 8000

    class ReusableTCPServer(socketserver.TCPServer):
        allow_reuse_address = True

    with ReusableTCPServer(('0.0.0.0', PORT), ProxyHandler) as httpd:
        print(f'✅ Frontend en  http://0.0.0.0:{PORT}')
        print(f'🔀 Proxy API -> {BACKEND}')
        print(f'📦 Gzip habilitado | 🔒 Cabeceras de seguridad activas | 💾 Cache-Control activo')
        print(f'📡 Rutas API: {ProxyHandler.API_PATHS}')
        httpd.serve_forever()