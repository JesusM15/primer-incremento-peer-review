/**
 * components/AuthManager.js
 * Sistema simple de gestión de roles (simulado)
 */

export const AuthManager = {
  _currentUser: null,
  _roles: ['Autor', 'Revisor', 'Editor'],

  /**
   * Inicializa el sistema de autenticación
   */
  init() {
    // Cargar usuario desde localStorage
    const savedUser = localStorage.getItem('peerreview_user');
    if (savedUser) {
      try {
        this._currentUser = JSON.parse(savedUser);
        
        // Validar que la sesión esté activa y tenga datos válidos
        if (!this._currentUser.sessionActive || !this._currentUser.id || !this._currentUser.role) {
          console.warn('⚠️ Sesión inválida o inactiva, limpiando');
          this._clearInvalidSession();
          return;
        }
        
        console.log('👤 Sesión activa encontrada:', this._currentUser.role);
        return;
      } catch (error) {
        console.warn('Error cargando usuario:', error);
        this._clearInvalidSession();
      }
    }

    // Si no hay sesión activa, redirigir a login
    console.log('🔍 No hay sesión activa, redirigiendo a login...');
    this._redirectToLogin();
  },

  /**
   * Limpia sesión inválida
   */
  _clearInvalidSession() {
    localStorage.removeItem('peerreview_user');
    sessionStorage.clear();
    this._currentUser = null;
  },

  /**
   * Redirige a página de login
   */
  _redirectToLogin() {
    // Evitar redirección infinita si ya estamos en login
    if (window.location.pathname.includes('login.html')) {
      return;
    }
    
    // Forzar recarga completa para limpiar estado
    window.location.replace('./login.html');
  },

  /**
   * Verifica si el usuario está autenticado
   */
  isAuthenticated() {
    const result = this._currentUser !== null && this._currentUser.sessionActive === true;
    console.log('🔧 isAuthenticated() llamado, resultado:', result, 'usuario:', this._currentUser);
    return result;
  },

  /**
   * Obtiene el usuario actual
   */
  getCurrentUser() {
    return this._currentUser;
  },

  /**
   * Obtiene el rol del usuario actual
   */
  getCurrentRole() {
    return this._currentUser ? this._currentUser.role : null;
  },

  /**
   * Verifica si el usuario tiene un rol específico
   */
  hasRole(role) {
    return this.getCurrentRole() === role;
  },

  /**
   * Verifica si el usuario puede realizar una acción
   */
  canPerformAction(action, articleStatus = null) {
    const role = this.getCurrentRole();
    
    switch (action) {
      case 'create_article':
        return role === 'Autor';
        
      case 'edit_article':
        return role === 'Autor';
        
      case 'start_review':
        return (role === 'Editor' || role === 'Revisor') && articleStatus === 'Recibido';
        
      case 'add_comment':
        return role === 'Editor' || role === 'Revisor';
        
      case 'approve_reject':
        return (role === 'Editor' || role === 'Revisor') && articleStatus === 'En Revisión';
        
      case 'delete_article':
        return role === 'Autor' || role === 'Editor';
        
      default:
        return false;
    }
  },

  /**
   * Muestra selector de rol solo si no está autenticado
   * NOTA: Esta función ya no se usa, ahora usamos login.html
   */
  _showRoleSelector() {
    // Redirigir a página de login en lugar de mostrar modal
    this._redirectToLogin();
  },

  /**
   * Establece el rol del usuario
   */
  _setUserRole(role) {
    console.log('🔧 _setUserRole llamado con:', role);
    
    this._currentUser = {
      id: `user_${Date.now()}`,
      name: `Usuario ${role}`,
      role: role,
      createdAt: new Date().toISOString()
    };

    console.log('🔧 Usuario creado:', this._currentUser);

    // Guardar en localStorage
    localStorage.setItem('peerreview_user', JSON.stringify(this._currentUser));
    console.log('🔧 Usuario guardado en localStorage');

    // Verificar que se guardó
    const saved = localStorage.getItem('peerreview_user');
    console.log('🔧 Verificación - Usuario en localStorage:', saved);

    // Disparar evento de cambio de usuario
    window.dispatchEvent(new CustomEvent('userChanged', {
      detail: { user: this._currentUser }
    }));

    console.log(`👤 Rol establecido: ${role}`);
    
    // Pequeña pausa antes de redirigir para asegurar que se guarde
    setTimeout(() => {
      console.log('🔧 Ejecutando redirección a dashboard...');
      window.location.replace('./dashboard.html');
    }, 100);
  },

  /**
   * Cambia de rol (cierra sesión y redirige a login)
   */
  switchRole() {
    console.log('🔄 Cambiando rol...');
    
    // Limpiar localStorage
    localStorage.removeItem('peerreview_user');
    
    // Limpiar estado actual
    this._currentUser = null;
    
    // Limpiar cualquier estado de sesión adicional
    sessionStorage.clear();
    
    // Forzar recarga para limpiar estado
    window.location.href = './login.html';
  },

  /**
   * Cierra sesión completamente
   */
  logout() {
    console.log('🚪 Cerrando sesión...');
    
    // Marcar sesión como inactiva
    if (this._currentUser) {
      this._currentUser.sessionActive = false;
      localStorage.setItem('peerreview_user', JSON.stringify(this._currentUser));
    }
    
    // Limpiar estado actual
    this._currentUser = null;
    
    // Limpiar cualquier estado de sesión adicional
    sessionStorage.clear();
    
    // Disparar evento de logout
    window.dispatchEvent(new CustomEvent('userLoggedOut'));
    
    // Forzar recarga para limpiar estado de la aplicación
    window.location.href = './login.html';
  },

  /**
   * Obtiene información del usuario para mostrar en UI
   */
  getUserDisplayInfo() {
    const user = this.getCurrentUser();
    if (!user) return null;

    const icons = {
      'Autor': '✍️',
      'Revisor': '👁️', 
      'Editor': '📝'
    };

    return {
      name: user.name,
      role: user.role,
      roleIcon: icons[user.role] || '�',
      roleColor: user.role === 'Autor' ? '#2563eb' : user.role === 'Editor' ? '#000' : '#666'
    };
  }
};
