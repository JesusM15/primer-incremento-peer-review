/**
 * components/ArticleList.js
 * Componente para mostrar y gestionar artículos en el tablero
 */

import { ArticleManager } from './ArticleManager.js';
import { AuthManager } from './AuthManager.js';
import { Router } from './Router.js';
import { Toast } from './Toast.js';

export const ArticleList = {
  _container: null,
  _articles: [],
  _currentFilter: 'all',

  /**
   * Inicializa el componente
   */
  async init(containerId = 'article-list') {
    this._container = document.getElementById(containerId);
    if (!this._container) {
      throw new Error(`Container #${containerId} no encontrado`);
    }

    await this._loadArticles();
    this._setupEventListeners();
    this._render();

    console.log('📋 ArticleList inicializado');
  },

  /**
   * Carga artículos desde IndexedDB
   */
  async _loadArticles() {
    try {
      this._articles = await ArticleManager.getAll();
      console.log(`📚 Cargados ${this._articles.length} artículos:`, this._articles);
      console.log('📋 Detalles de artículos:', this._articles.map(a => ({
        id: a.id,
        title: a.title,
        status: a.status,
        createdAt: a.createdAt
      })));
    } catch (error) {
      console.error('❌ Error cargando artículos:', error);
      this._articles = [];
    }
  },

  /**
   * Configura event listeners
   */
  _setupEventListeners() {
    // Escuchar cambios de usuario
    window.addEventListener('userChanged', () => {
      this._render();
    });

    // Escuchar cambios de artículos (si hay un sistema de eventos)
    window.addEventListener('articlesChanged', () => {
      this._loadArticles().then(() => this._render());
    });
  },

  /**
   * Renderiza la lista de artículos
   */
  _render() {
    if (!this._container) {
      console.error('❌ Container no encontrado');
      return;
    }

    const user = AuthManager.getCurrentUser();
    const filteredArticles = this._getFilteredArticles();
    
    console.log('🎨 Renderizando ArticleList:');
    console.log('📊 Total artículos:', this._articles.length);
    console.log('🔍 Filtrados:', filteredArticles.length);
    console.log('👤 Usuario:', user);
    console.log('📦 Container:', this._container);

    /*
          <span>${user ? `${user.roleIcon} ${user.name}` : 'Usuario no identificado'}</span>
          ${user ? `<button class="switch-role-btn" onclick="AuthManager.switchRole()">Cambiar rol</button>` : ''}
    */

    this._container.innerHTML = `
      <div class="article-list-header">
        <h2>Tablero de Artículos</h2>
        <div class="user-info">

        </div>
      </div>
      
      <div class="filters">
        <button class="filter-btn ${this._currentFilter === 'all' ? 'active' : ''}" data-filter="all">
          Todos (${this._articles.length})
        </button>
        <button class="filter-btn ${this._currentFilter === 'Recibido' ? 'active' : ''}" data-filter="Recibido">
          Recibidos (${this._getCountByStatus('Recibido')})
        </button>
        <button class="filter-btn ${this._currentFilter === 'En Revisión' ? 'active' : ''}" data-filter="En Revisión">
          En Revisión (${this._getCountByStatus('En Revisión')})
        </button>
        <button class="filter-btn ${this._currentFilter === 'Aceptado' ? 'active' : ''}" data-filter="Aceptado">
          Aceptados (${this._getCountByStatus('Aceptado')})
        </button>
        <button class="filter-btn ${this._currentFilter === 'Rechazado' ? 'active' : ''}" data-filter="Rechazado">
          Rechazados (${this._getCountByStatus('Rechazado')})
        </button>
      </div>

      <div class="articles-grid">
        ${filteredArticles.length === 0 ? 
          '<div class="empty-state">No hay artículos en esta categoría</div>' :
          filteredArticles.map(article => this._renderArticle(article)).join('')
        }
      </div>
    `;

    // Agregar event listeners a los filtros
    this._container.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this._setFilter(e.target.dataset.filter);
      });
    });

    // Agregar event listeners a las acciones de artículos
    this._setupArticleActions();
  },

  /**
   * Renderiza un artículo individual
   */
  _renderArticle(article) {
    const user = AuthManager.getCurrentUser();
    const statusClass = this._getStatusClass(article.status);
    const canEdit = AuthManager.canPerformAction('edit_article');
    const canStartReview = AuthManager.canPerformAction('start_review', article.status);
    const canApproveReject = AuthManager.canPerformAction('approve_reject', article.status);

    return `
      <div class="article-card" data-article-id="${article.id}">
        <div class="article-header">
          <h3 class="article-title">${this._escapeHtml(article.title)}</h3>
          <span class="article-status ${statusClass}">${article.status}</span>
        </div>
        
        <div class="article-info">
          <p class="article-date">
            Creado: ${new Date(article.createdAt).toLocaleDateString('es-ES')}
          </p>
          ${article.file ? `<p class="article-file">📄 ${this._escapeHtml(article.file.name)}</p>` : ''}
          <p class="article-id">ID: ${article.id}</p>
        </div>
        
        <div class="article-actions">
          ${canEdit ? `
            <button class="action-btn edit-btn" onclick="window.ArticleList._editArticle('${article.id}')">
              ✏️ Editar
            </button>
          ` : ''}
          
          ${canStartReview ? `
            <button class="action-btn review-btn" onclick="window.ArticleList._startReview('${article.id}')">
              👁️ Iniciar Revisión
            </button>
          ` : ''}
          
          ${canApproveReject ? `
            <button class="action-btn approve-btn" onclick="window.ArticleList._approveArticle('${article.id}')">
              ✅ Aceptar
            </button>
            <button class="action-btn reject-btn" onclick="window.ArticleList._rejectArticle('${article.id}')">
              ❌ Rechazar
            </button>
          ` : ''}
          
          ${canEdit ? `
            <button class="action-btn delete-btn" onclick="window.ArticleList._deleteArticle('${article.id}')">
              🗑️ Eliminar
            </button>
          ` : ''}
        </div>
      </div>
    `;
  },

  /**
   * Obtiene la clase CSS para el estado
   */
  _getStatusClass(status) {
    const statusClasses = {
      'Recibido': 'status-received',
      'En Revisión': 'status-reviewing',
      'Aceptado': 'status-approved',
      'Rechazado': 'status-rejected'
    };
    return statusClasses[status] || 'status-default';
  },

  /**
   * Escapa HTML para prevenir XSS
   */
  _escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  /**
   * Filtra artículos según el filtro actual
   */
  _getFilteredArticles() {
    console.log('🔍 Filtrando artículos:', this._currentFilter);
    console.log('📋 Artículos disponibles:', this._articles.map(a => ({ id: a.id, status: a.status })));
    
    if (this._currentFilter === 'all') {
      console.log('✅ Filtro "all", retornando todos');
      return this._articles;
    }
    
    const filtered = this._articles.filter(article => article.status === this._currentFilter);
    console.log('🎯 Resultado filtrado:', filtered.map(a => ({ id: a.id, status: a.status })));
    return filtered;
  },

  /**
   * Obtiene la cantidad de artículos por estado
   */
  _getCountByStatus(status) {
    return this._articles.filter(article => article.status === status).length;
  },

  /**
   * Establece el filtro actual
   */
  _setFilter(filter) {
    this._currentFilter = filter;
    this._render();
  },

  /**
   * Configura acciones de artículos
   */
  _setupArticleActions() {
    // Las acciones se manejan mediante onclick en el HTML
  },

  /**
   * Edita un artículo
   */
  _editArticle(articleId) {
    Router.navigate(`edit/${articleId}`);
  },

  /**
   * Inicia la revisión de un artículo
   */
  async _startReview(articleId) {
    try {
      await ArticleManager.update(articleId, { status: 'En Revisión' });
      await this._loadArticles();
      this._render();
      
      // Mostrar notificación
      this._showNotification('Artículo enviado a revisión', 'success');
    } catch (error) {
      console.error('Error iniciando revisión:', error);
      this._showNotification('Error al iniciar revisión', 'error');
    }
  },

  /**
   * Aprueba un artículo
   */
  async _approveArticle(articleId) {
    try {
      await ArticleManager.update(articleId, { status: 'Aceptado' });
      await this._loadArticles();
      this._render();
      
      this._showNotification('Artículo aceptado', 'success');
    } catch (error) {
      console.error('Error aprobando artículo:', error);
      this._showNotification('Error al aprobar artículo', 'error');
    }
  },

  /**
   * Rechaza un artículo
   */
  async _rejectArticle(articleId) {
    const reason = prompt('Motivo del rechazo (opcional):');
    
    try {
      await ArticleManager.update(articleId, { 
        status: 'Rechazado',
        rejectionReason: reason || 'Sin motivo especificado'
      });
      await this._loadArticles();
      this._render();
      
      this._showNotification('Artículo rechazado', 'error');
    } catch (error) {
      console.error('Error rechazando artículo:', error);
      this._showNotification('Error al rechazar artículo', 'error');
    }
  },

  /**
   * Elimina un artículo
   */
  async _deleteArticle(articleId) {
    if (!confirm('¿Estás seguro de eliminar este artículo? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      await ArticleManager.delete(articleId);
      await this._loadArticles();
      this._render();
    } catch (error) {
      console.error('Error eliminando artículo:', error);
      this._showNotification('Error al eliminar artículo', 'error');
    }
  },

  /**
   * Muestra una notificación
   */
  _showNotification(message, type = 'info') {
    // Usar Toast para notificaciones visuales
    if (type === 'success') {
      Toast.success(message);
    } else if (type === 'error') {
      Toast.error(message);
    } else {
      Toast.info(message);
    }
  },

  /**
   * Refresca la lista
   */
  async refresh() {
    await this._loadArticles();
    this._render();
  }
};

// Hacer disponible globalmente para onclick
window.ArticleList = ArticleList;
