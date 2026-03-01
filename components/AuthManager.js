/**
 * components/AuthManager.js
 * Sistema simple de gestión de roles (simulado)
 */

export const AuthManager = {
  _currentUser: null,
  _roles: ['Editor', 'Revisor'],

  /**
   * Inicializa el sistema de autenticación
   */
  init() {
    // Cargar usuario desde localStorage
    const savedUser = localStorage.getItem('peerreview_user');
    if (savedUser) {
      try {
        this._currentUser = JSON.parse(savedUser);
      } catch (error) {
        console.warn('Error cargando usuario:', error);
        this._currentUser = null;
      }
    }

    // Si no hay usuario, mostrar selector de rol
    if (!this._currentUser) {
      this._showRoleSelector();
    }

    console.log('👤 AuthManager inicializado:', this._currentUser);
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
        return role === 'Editor';
      
      case 'edit_article':
        return role === 'Editor';
      
      case 'start_review':
        return role === 'Editor' && articleStatus === 'Recibido';
      
      case 'assign_reviewer':
        return role === 'Editor' && articleStatus === 'En Revisión';
      
      case 'approve_reject':
        return role === 'Revisor' && articleStatus === 'En Revisión';
      
      case 'delete_article':
        return role === 'Editor';
      
      default:
        return false;
    }
  },

  /**
   * Muestra selector de rol
   */
  _showRoleSelector() {
    // Crear modal de selección de rol
    const modal = document.createElement('div');
    modal.id = 'role-selector';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10000;
    `;

    const content = document.createElement('div');
    content.style.cssText = `
      background: white;
      border: 1px solid #000;
      padding: 2rem;
      max-width: 400px;
      width: 90%;
    `;

    content.innerHTML = `
      <h2 style="margin-bottom: 1rem; font-size: 1.2rem;">Selecciona tu rol</h2>
      <p style="margin-bottom: 1.5rem; color: #666; font-size: 0.9rem;">
        Elige tu rol para usar el sistema de revisión por pares:
      </p>
      <div style="display: flex; flex-direction: column; gap: 0.5rem;">
        <button class="role-btn" data-role="Editor" style="padding: 0.75rem; border: 1px solid #000; background: white; cursor: pointer;">
          📝 Editor - Puede crear y asignar artículos para revisión
        </button>
        <button class="role-btn" data-role="Revisor" style="padding: 0.75rem; border: 1px solid #000; background: white; cursor: pointer;">
          👁️ Revisor - Puede aprobar o rechazar artículos
        </button>
      </div>
    `;

    modal.appendChild(content);
    document.body.appendChild(modal);

    // Event listeners
    const buttons = modal.querySelectorAll('.role-btn');
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        const role = btn.dataset.role;
        this._setUserRole(role);
        document.body.removeChild(modal);
      });
    });

    // Hover effects
    buttons.forEach(btn => {
      btn.addEventListener('mouseenter', () => {
        btn.style.background = '#000';
        btn.style.color = '#fff';
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.background = '#fff';
        btn.style.color = '#000';
      });
    });
  },

  /**
   * Establece el rol del usuario
   */
  _setUserRole(role) {
    this._currentUser = {
      id: `user_${Date.now()}`,
      name: `Usuario ${role}`,
      role: role,
      createdAt: new Date().toISOString()
    };

    // Guardar en localStorage
    localStorage.setItem('peerreview_user', JSON.stringify(this._currentUser));

    // Disparar evento de cambio de usuario
    window.dispatchEvent(new CustomEvent('userChanged', {
      detail: { user: this._currentUser }
    }));

    console.log(`👤 Rol establecido: ${role}`);
  },

  /**
   * Cambia de rol
   */
  switchRole() {
    localStorage.removeItem('peerreview_user');
    this._currentUser = null;
    this._showRoleSelector();
  },

  /**
   * Cierra sesión
   */
  logout() {
    localStorage.removeItem('peerreview_user');
    this._currentUser = null;
    
    // Disparar evento de logout
    window.dispatchEvent(new CustomEvent('userLoggedOut'));
    
    // Recargar página
    window.location.reload();
  },

  /**
   * Obtiene información del usuario para mostrar en UI
   */
  getUserDisplayInfo() {
    const user = this.getCurrentUser();
    if (!user) return null;

    return {
      name: user.name,
      role: user.role,
      roleIcon: user.role === 'Editor' ? '📝' : '👁️',
      roleColor: user.role === 'Editor' ? '#000' : '#666'
    };
  }
};
