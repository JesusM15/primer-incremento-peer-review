/**
 * components/Toast.js
 * Sistema de notificaciones toast simple
 */

export const Toast = {
  /**
   * Muestra una notificación temporal
   * @param {string} message - Mensaje a mostrar
   * @param {string} type - Tipo: 'success' | 'error' | 'info'
   * @param {number} duration - Duración en ms (default: 3000)
   */
  show(message, type = 'info', duration = 3000) {
    // Crear contenedor si no existe
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 10000;
        display: flex;
        flex-direction: column;
        gap: 10px;
      `;
      document.body.appendChild(container);
    }

    // Crear toast
    const toast = document.createElement('div');
    
    // Colores según tipo
    const colors = {
      success: { bg: '#4CAF50', icon: '✅' },
      error:   { bg: '#f44336', icon: '❌' },
      info:    { bg: '#2196F3', icon: 'ℹ️' }
    };
    
    const style = colors[type] || colors.info;
    
    toast.style.cssText = `
      background: ${style.bg};
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 14px;
      font-weight: 500;
      min-width: 200px;
      animation: slideIn 0.3s ease;
    `;
    
    toast.innerHTML = `${style.icon} ${message}`;
    
    // Agregar al contenedor
    container.appendChild(toast);
    
    // Auto-eliminar después de la duración
    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => {
        toast.remove();
        // Eliminar contenedor si está vacío
        if (container.children.length === 0) {
          container.remove();
        }
      }, 300);
    }, duration);
  },
  
  success(message, duration = 3000) {
    this.show(message, 'success', duration);
  },
  
  error(message, duration = 3000) {
    this.show(message, 'error', duration);
  },
  
  info(message, duration = 3000) {
    this.show(message, 'info', duration);
  }
};

// Agregar estilos de animación
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);
