/**
 * pages/dashboard.js
 * Controlador de la página del tablero
 */

import { ArticleList } from '../components/ArticleList.js';
import { AuthManager } from '../components/AuthManager.js';
import { Router } from '../components/Router.js';

/**
 * Inicializa la página del dashboard
 */
async function initDashboard() {
  console.log('📊 Inicializando dashboard...');

  // Inicializar AuthManager si no está inicializado
  if (!AuthManager.getCurrentUser()) {
    AuthManager.init();
  }

  // Mostrar vista de dashboard
  Router.showView('dashboard');

  // Esperar a que el DOM esté completamente listo
  await new Promise(resolve => {
    if (document.readyState === 'complete') {
      resolve();
    } else {
      window.addEventListener('load', resolve, { once: true });
    }
  });

  // Esperar adicional y reintentar si los elementos no existen
  let attempts = 0;
  const maxAttempts = 10;
  
  while (attempts < maxAttempts) {
    const articleList = document.getElementById('article-list');
    const dashboardContent = document.getElementById('dashboard-content');
    
    console.log(`🔍 Intento ${attempts + 1}/${maxAttempts}`);
    console.log('🔍 article-list existe:', articleList);
    console.log('🔍 dashboardContent encontrado:', dashboardContent);
    
    if (!articleList && dashboardContent) {
      console.log('🔧 Creando article-list container...');
      dashboardContent.innerHTML = '<div id="article-list"></div>';
      break;
    } else if (articleList) {
      console.log('🔧 article-list ya existe, no se crea');
      break;
    }
    
    attempts++;
    if (attempts < maxAttempts) {
      console.log('⏳ Esperando 100ms antes de reintentar...');
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  if (attempts >= maxAttempts) {
    console.error('❌ No se pudo encontrar dashboard-content después de varios intentos');
    return;
  }

  // Inicializar lista de artículos
  try {
    console.log('🔍 Inicializando ArticleList...');
    await ArticleList.init();
    console.log('✅ ArticleList inicializado correctamente');
  } catch (error) {
    console.error('❌ Error inicializando ArticleList:', error);
    showError('Error al cargar el tablero');
  }

  // Configurar botón de nuevo artículo (solo para Editores)
  const newArticleBtn = document.getElementById('new-article-btn');
  if (newArticleBtn) {
    const canCreate = AuthManager.canPerformAction('create_article');
    newArticleBtn.style.display = canCreate ? 'block' : 'none';
    
    newArticleBtn.addEventListener('click', () => {
      Router.navigate('edit');
    });
  }

  // Configurar botón de refrescar
  const refreshBtn = document.getElementById('refresh-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
      refreshBtn.disabled = true;
      refreshBtn.textContent = 'Actualizando...';
      
      try {
        await ArticleList.refresh();
      } finally {
        refreshBtn.disabled = false;
        refreshBtn.textContent = '🔄 Actualizar';
      }
    });
  }

  // Escuchar notificaciones
  window.addEventListener('showNotification', (event) => {
    showNotification(event.detail.message, event.detail.type);
  });

  console.log('✅ Dashboard inicializado');
}

/**
 * Muestra un mensaje de error
 */
function showError(message) {
  const errorEl = document.createElement('div');
  errorEl.className = 'error-message';
  errorEl.textContent = message;
  errorEl.style.cssText = `
    background: #dc2626;
    color: white;
    padding: 1rem;
    margin: 1rem 0;
    border-radius: 4px;
    text-align: center;
  `;

  const container = document.getElementById('dashboard-content');
  if (container) {
    container.insertBefore(errorEl, container.firstChild);
    
    // Auto-eliminar después de 5 segundos
    setTimeout(() => {
      if (errorEl.parentNode) {
        errorEl.parentNode.removeChild(errorEl);
      }
    }, 5000);
  }
}

/**
 * Muestra una notificación temporal
 */
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: ${type === 'success' ? '#16a34a' : type === 'error' ? '#dc2626' : '#000'};
    color: white;
    padding: 12px 16px;
    border-radius: 4px;
    font-size: 14px;
    z-index: 2000;
    max-width: 300px;
    opacity: 0;
    transform: translateY(20px);
    transition: all 0.3s ease;
  `;

  document.body.appendChild(notification);

  // Animación de entrada
  setTimeout(() => {
    notification.style.opacity = '1';
    notification.style.transform = 'translateY(0)';
  }, 10);

  // Auto-eliminar después de 3 segundos
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transform = 'translateY(20px)';
    
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 3000);
}

// Exportar para uso en el router
export { initDashboard };
