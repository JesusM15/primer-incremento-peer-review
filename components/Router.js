/**
 * components/Router.js
 * Sistema de navegación simple mediante hash
 */

export const Router = {
  _routes: new Map(),
  _currentRoute: null,

  /**
   * Inicializa el router
   */
  init() {
    // Escuchar cambios de hash
    window.addEventListener('hashchange', () => {
      this._handleRoute();
    });

    // Manejar ruta inicial
    this._handleRoute();

    console.log('🛣️ Router inicializado');
  },

  /**
   * Registra una ruta
   * @param {string} path - Ruta con hash (ej: '#dashboard')
   * @param {Function} handler - Función a ejecutar
   */
  register(path, handler) {
    this._routes.set(path, handler);
  },

  /**
   * Navega a una ruta
   * @param {string} path - Ruta con hash
   */
  navigate(path) {
    if (!path.startsWith('#')) {
      path = '#' + path;
    }
    window.location.hash = path;
  },

  /**
   * Obtiene la ruta actual
   */
  getCurrentRoute() {
    return window.location.hash || '#dashboard';
  },

  /**
   * Maneja el cambio de ruta
   */
  _handleRoute() {
    const route = this.getCurrentRoute();
    console.log('🔍 Router: manejando ruta:', route);
    console.log('🗺️ Rutas registradas:', Array.from(this._routes.keys()));
    
    if (this._currentRoute === route) {
      return; // No hacer nada si es la misma ruta
    }

    // Ocultar todas las vistas
    this._hideAllViews();

    // Buscar y ejecutar handler
    const handler = this._routes.get(route);
    console.log('🎯 Handler encontrado para', route, ':', !!handler);
    
    if (handler) {
      try {
        handler(route);
        this._currentRoute = route;
        console.log(`📍 Navegando a: ${route}`);
      } catch (error) {
        console.error(`❌ Error en ruta ${route}:`, error);
        this._showError('Error al cargar la página');
      }
    } else {
      // Buscar rutas con parámetros
      for (const [pattern, patternHandler] of this._routes) {
        if (pattern.includes(':')) {
          const params = this.getParams(pattern);
          if (params) {
            console.log('🎯 Ruta con parámetros encontrada:', pattern, params);
            try {
              patternHandler(route);
              this._currentRoute = route;
              console.log(`📍 Navegando a: ${route} (con parámetros)`);
              return;
            } catch (error) {
              console.error(`❌ Error en ruta ${pattern}:`, error);
              this._showError('Error al cargar la página');
              return;
            }
          }
        }
      }
      
      console.warn(`⚠️ Ruta no encontrada: ${route}`);
      this._showError('Página no encontrada');
    }
  },

  /**
   * Método público para manejar rutas
   */
  handleRoute() {
    this._handleRoute();
  },

  /**
   * Oculta todas las vistas
   */
  _hideAllViews() {
    const views = document.querySelectorAll('[data-view]');
    views.forEach(view => {
      view.style.display = 'none';
    });
  },

  /**
   * Muestra una vista específica
   * @param {string} viewName - Nombre del atributo data-view
   */
  showView(viewName) {
    console.log('👁️ Router.showView:', viewName);
    this._hideAllViews();
    
    const view = document.querySelector(`[data-view="${viewName}"]`);
    console.log('🎯 Vista encontrada:', !!view, view);
    
    if (view) {
      view.style.display = 'block';
      console.log('✅ Vista mostrada:', viewName);
    } else {
      console.warn(`❌ Vista no encontrada: ${viewName}`);
    }
  },

  /**
   * Muestra mensaje de error
   */
  _showError(message) {
    // Crear o actualizar elemento de error
    let errorEl = document.getElementById('router-error');
    if (!errorEl) {
      errorEl = document.createElement('div');
      errorEl.id = 'router-error';
      errorEl.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #dc2626;
        color: white;
        padding: 20px;
        border-radius: 4px;
        text-align: center;
        z-index: 9999;
      `;
      document.body.appendChild(errorEl);
    }
    
    errorEl.textContent = message;
    
    // Auto-ocultar después de 3 segundos
    setTimeout(() => {
      if (errorEl.parentNode) {
        errorEl.parentNode.removeChild(errorEl);
      }
    }, 3000);
  },

  /**
   * Obtiene parámetros de la ruta
   * @param {string} pattern - Patrón de ruta (ej: '#edit/:id')
   * @returns {Object|null} - Parámetros extraídos
   */
  getParams(pattern) {
    const current = this.getCurrentRoute();
    
    if (pattern.includes(':')) {
      const patternParts = pattern.split('/');
      const currentParts = current.split('/');
      
      if (patternParts.length !== currentParts.length) {
        return null;
      }
      
      const params = {};
      for (let i = 0; i < patternParts.length; i++) {
        if (patternParts[i].startsWith(':')) {
          const paramName = patternParts[i].substring(1);
          params[paramName] = currentParts[i];
        }
      }
      
      return params;
    }
    
    return null;
  }
};
