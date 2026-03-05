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
  _renderCache: new Map(),
  _lastRenderTime: 0,
  _debouncedRender: null,
  _visibleArticles: new Set(),
  _intersectionObserver: null,
  _itemsPerPage: 10,
  _currentPage: 1,

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
    this._setupIntersectionObserver();
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
   * Configura Intersection Observer para lazy loading
   */
  _setupIntersectionObserver() {
    if (!('IntersectionObserver' in window)) {
      console.log('⚠️ IntersectionObserver no soportado');
      return;
    }

    this._intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const articleId = entry.target.dataset.articleId;
            if (articleId && !this._visibleArticles.has(articleId)) {
              this._visibleArticles.add(articleId);
              this._loadArticleDetails(articleId);
            }
          }
        });
      },
      {
        root: null,
        rootMargin: '50px',
        threshold: 0.1
      }
    );
  },

  /**
   * Carga detalles de un artículo cuando se vuelve visible
   */
  async _loadArticleDetails(articleId) {
    try {
      const article = this._articles.find(a => a.id === articleId);
      if (article && !article.detailsLoaded) {
        // Simular carga de detalles adicionales
        article.detailsLoaded = true;
        console.log(`📖 Cargados detalles del artículo ${articleId}`);
        
        // Actualizar solo la tarjeta del artículo específico
        this._updateArticleCard(articleId);
      }
    } catch (error) {
      console.error(`Error cargando detalles del artículo ${articleId}:`, error);
    }
  },

  /**
   * Actualiza una tarjeta de artículo específica
   */
  _updateArticleCard(articleId) {
    const article = this._articles.find(a => a.id === articleId);
    if (!article) return;

    const cardElement = this._container.querySelector(`[data-article-id="${articleId}"]`);
    if (cardElement) {
      const newHTML = this._renderArticle(article);
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = newHTML;
      const newCard = tempDiv.firstElementChild;
      
      // Reemplazar la tarjeta
      cardElement.replaceWith(newCard);
      
      // Observar la nueva tarjeta
      if (this._intersectionObserver) {
        this._intersectionObserver.observe(newCard);
      }
    }
  },

  /**
   * Renderiza la lista de artículos con optimización
   */
  _render() {
    // Evitar renders múltiples seguidos con debounce
    if (this._debouncedRender) {
      clearTimeout(this._debouncedRender);
    }
    
    this._debouncedRender = setTimeout(() => {
      this._performRender();
    }, 16); // ~60fps
  },

  /**
   * Realiza el renderizado optimizado
   */
  _performRender() {
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

    // Crear cache key para evitar re-renders innecesarios
    const cacheKey = `${this._currentFilter}_${this._articles.length}_${JSON.stringify(filteredArticles.map(a => a.id + a.status))}`;
    
    if (this._renderCache.has(cacheKey)) {
      const cachedHTML = this._renderCache.get(cacheKey);
      if (Date.now() - this._lastRenderTime < 1000) { // 1 segundo cache
        this._container.innerHTML = cachedHTML;
        this._setupArticleActions();
        return;
      }
    }

    const html = this._generateHTML(filteredArticles, user);
    
    // Actualizar cache
    this._renderCache.set(cacheKey, html);
    this._lastRenderTime = Date.now();
    
    // Limitar tamaño del cache
    if (this._renderCache.size > 10) {
      const firstKey = this._renderCache.keys().next().value;
      this._renderCache.delete(firstKey);
    }

    this._container.innerHTML = html;
    this._setupArticleActions();
  },

  /**
   * Genera HTML de forma optimizada
   */
  _generateHTML(filteredArticles, user) {
    const paginatedArticles = this._getPaginatedArticles();
    const totalPages = Math.ceil(filteredArticles.length / this._itemsPerPage);
    
    return `
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
        ${paginatedArticles.length === 0 ? 
          '<div class="empty-state">No hay artículos en esta categoría</div>' :
          paginatedArticles.map(article => this._renderArticle(article)).join('')
        }
      </div>
      
      ${totalPages > 1 ? `
        <div class="pagination-info">
          <span>Página ${this._currentPage} de ${totalPages} (${filteredArticles.length} artículos)</span>
        </div>
      ` : ''}
    `;
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
    const canComment = AuthManager.canPerformAction('add_comment');

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
          <button class="action-btn view-btn" onclick="window.ArticleList._viewArticle('${article.id}')">
            👁️ Ver Detalles
          </button>
          
          ${canEdit ? `
            <button class="action-btn edit-btn" onclick="window.ArticleList._editArticle('${article.id}')">
              ✏️ Editar
            </button>
          ` : ''}
          
          ${canStartReview ? `
            <button class="action-btn review-btn" onclick="window.ArticleList._startReview('${article.id}')">
              � Iniciar Revisión
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
          
          ${canComment ? `
            <button class="action-btn comment-btn" onclick="window.ArticleList._commentArticle('${article.id}')">
              💬 Comentar
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

    // Infinite scroll
    this._container.addEventListener('scroll', this._debounce(() => {
      this._handleScroll();
    }, 100));
  },

  /**
   * Maneja scroll para infinite loading
   */
  _handleScroll() {
    const scrollTop = this._container.scrollTop;
    const scrollHeight = this._container.scrollHeight;
    const clientHeight = this._container.clientHeight;

    // Cargar más artículos cuando falte 20% para llegar al final
    if (scrollTop + clientHeight >= scrollHeight * 0.8) {
      this._loadMoreArticles();
    }
  },

  /**
   * Carga más artículos para infinite scroll
   */
  _loadMoreArticles() {
    const filteredArticles = this._getFilteredArticles();
    const totalPages = Math.ceil(filteredArticles.length / this._itemsPerPage);
    
    if (this._currentPage < totalPages) {
      this._currentPage++;
      this._render();
      console.log(`📄 Cargando página ${this._currentPage} de ${totalPages}`);
    }
  },

  /**
   * Obtiene artículos paginados
   */
  _getPaginatedArticles() {
    const filteredArticles = this._getFilteredArticles();
    const startIndex = (this._currentPage - 1) * this._itemsPerPage;
    const endIndex = startIndex + this._itemsPerPage;
    
    return filteredArticles.slice(startIndex, endIndex);
  },

  /**
   * Utilidad para debounce
   */
  _debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  /**
   * Obtiene la cantidad de artículos por estado
   */
  _getCountByStatus(status) {
    return this._articles.filter(article => article.status === status).length;
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
   * Establece el filtro actual
   */
  _setFilter(filter) {
    this._currentFilter = filter;
    this._currentPage = 1; // Resetear paginación
    this._render();
  },

  /**
   * Configura acciones de artículos
   */
  _setupArticleActions() {
    // Agregar event listeners a los filtros
    this._container.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this._setFilter(e.target.dataset.filter);
      });
    });
    
    // Observar tarjetas de artículos para lazy loading
    if (this._intersectionObserver) {
      this._container.querySelectorAll('.article-card').forEach(card => {
        this._intersectionObserver.observe(card);
      });
    }
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
   * Ver detalles de artículo
   */
  _viewArticle(articleId) {
    // Navegar a vista de detalles
    Router.navigate(`article/${articleId}`);
  },

  /**
   * Comentar artículo
   */
  _commentArticle(articleId) {
    // Navegar a vista de detalles con foco en comentarios
    Router.navigate(`article/${articleId}`);
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
