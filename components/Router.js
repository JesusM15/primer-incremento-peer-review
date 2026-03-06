/**
 * components/Router.js
 * Sistema de navegación simple mediante hash
 */

export const Router = {
  _routes: new Map(),
  _currentRoute: null,

  init() {
    window.addEventListener('hashchange', () => this._handleRoute());
    this._handleRoute();
    console.log('🛣️ Router inicializado');
  },

  register(path, handler) {
    this._routes.set(path, handler);
  },

  navigate(path) {
    if (!path.startsWith('#')) path = '#' + path;
    window.location.hash = path;
  },

  getCurrentRoute() {
    return window.location.hash || '#dashboard';
  },

  /**
   * Comprueba si `pattern` coincide con `route`.
   * - Los segmentos que empiezan por ':' capturan el valor del segmento correspondiente.
   * - Los segmentos fijos deben coincidir EXACTAMENTE.
   *
   * Ejemplos:
   *   _matchPattern('#edit/:id',    '#edit/abc')    → { id: 'abc' }
   *   _matchPattern('#edit/:id',    '#article/abc') → null  ('#edit' ≠ '#article')
   *   _matchPattern('#article/:id', '#article/abc') → { id: 'abc' }
   */
  _matchPattern(pattern, route) {
    const pp = pattern.split('/');
    const rp = route.split('/');
    if (pp.length !== rp.length) return null;

    const params = {};
    for (let i = 0; i < pp.length; i++) {
      if (pp[i].startsWith(':')) {
        params[pp[i].slice(1)] = rp[i];  // capturar param
      } else if (pp[i] !== rp[i]) {
        return null;                       // segmento fijo no coincide → no es esta ruta
      }
    }
    return params;
  },

  _handleRoute() {
    const route = this.getCurrentRoute();

    // Evitar doble-disparo en la misma ruta
    if (this._currentRoute === route) return;

    this._hideAllViews();

    // 1. Coincidencia exacta (sin parámetros)
    const exactHandler = this._routes.get(route);
    if (exactHandler) {
      try {
        exactHandler(route);
        this._currentRoute = route;
        console.log(`📍 Ruta exacta: ${route}`);
      } catch (e) {
        console.error(`❌ Error en ruta ${route}:`, e);
        this._showError('Error al cargar la página');
      }
      return;
    }

    // 2. Rutas con parámetros — primera que coincida gana
    for (const [pattern, handler] of this._routes) {
      if (!pattern.includes(':')) continue;
      const params = this._matchPattern(pattern, route);
      if (params !== null) {
        console.log(`📍 Ruta por patrón: ${pattern} →`, params);
        try {
          handler(route);
          this._currentRoute = route;
        } catch (e) {
          console.error(`❌ Error en ruta ${pattern}:`, e);
          this._showError('Error al cargar la página');
        }
        return;
      }
    }

    console.warn(`⚠️ Ruta no encontrada: ${route}`);
    this._showError('Página no encontrada');
  },

  // Alias público para llamadas externas
  handleRoute() {
    this._handleRoute();
  },

  _hideAllViews() {
    document.querySelectorAll('[data-view]').forEach(v => (v.style.display = 'none'));
  },

  showView(viewName) {
    this._hideAllViews();
    const view = document.querySelector(`[data-view="${viewName}"]`);
    if (view) {
      view.style.display = 'block';
    } else {
      console.warn(`❌ Vista no encontrada: ${viewName}`);
    }
  },

  _showError(message) {
    let el = document.getElementById('router-error');
    if (!el) {
      el = document.createElement('div');
      el.id = 'router-error';
      el.style.cssText =
        'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);' +
        'background:#dc2626;color:#fff;padding:20px;border-radius:4px;' +
        'text-align:center;z-index:9999;';
      document.body.appendChild(el);
    }
    el.textContent = message;
    setTimeout(() => el.parentNode?.removeChild(el), 3000);
  },

  /**
   * API pública: devuelve los params de la ruta actual para el patrón dado.
   * Uso: Router.getParams('#edit/:id')  → { id: '...' }
   */
  getParams(pattern) {
    return this._matchPattern(pattern, this.getCurrentRoute());
  }
};
