#!/usr/bin/env python3
import http.server
import socketserver
import urllib.request
import urllib.error

BACKEND = 'http://localhost:3001'

class ProxyHandler(http.server.SimpleHTTPRequestHandler):

    def _proxy(self, method):
        """Redirige cualquier ruta de API al backend Node.js"""
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length) if content_length else None

            req = urllib.request.Request(
                f'{BACKEND}{self.path}',
                data=body,
                method=method
            )
            req.add_header('Content-Type', self.headers.get('Content-Type', 'application/json'))

            response = urllib.request.urlopen(req)
            data = response.read()

            self.send_response(response.getcode())
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(data)

        except urllib.error.HTTPError as e:
            self.send_response(e.code)
            self.end_headers()
            self.wfile.write(e.read())
        except Exception as e:
            self.send_response(503)
            self.end_headers()

    API_PATHS = ('/articles', '/sync', '/ping', '/health')

    def _is_api(self):
        return any(self.path.startswith(p) for p in self.API_PATHS)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_GET(self):
        if self._is_api(): self._proxy('GET')
        else: super().do_GET()

    def do_POST(self):
        if self._is_api(): self._proxy('POST')
        else: super().do_POST()

    def do_PUT(self):
        if self._is_api(): self._proxy('PUT')
        else: super().do_PUT()

    def do_DELETE(self):
        if self._is_api(): self._proxy('DELETE')
        else: super().do_DELETE()

    def do_HEAD(self):
        if self._is_api(): self._proxy('HEAD')
        else: super().do_HEAD()

    def log_message(self, format, *args):
        print(f"[{self.address_string()}] {format % args}")

if __name__ == '__main__':
    PORT = 8000
    with socketserver.TCPServer(('0.0.0.0', PORT), ProxyHandler) as httpd:
        print(f'✅ Frontend en  http://0.0.0.0:{PORT}')
        print(f'🔀 Proxy API -> http://localhost:3001')
        httpd.serve_forever()