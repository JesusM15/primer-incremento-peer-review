/**
 * components/ArticleDetail.js
 * Vista detallada de artículo con comentarios y acciones
 */

import { ArticleManager } from './ArticleManager.js';
import { CommentManager } from './CommentManager.js';
import { AuthManager } from './AuthManager.js';
import { Toast } from './Toast.js';

export const ArticleDetail = {
  _container: null,
  _article: null,
  _comments: [],

  /**
   * Inicializa la vista de detalle
   */
  async init(containerId, articleId) {
    this._container = document.getElementById(containerId);
    if (!this._container) {
      throw new Error(`Container #${containerId} no encontrado`);
    }

    try {
      // Cargar artículo y comentarios
      await this._loadArticle(articleId);
      await this._loadComments(articleId);

      // Renderizar vista
      this._render();

      // Si venimos del botón "Comentar", abrir secciones y hacer scroll
      if (sessionStorage.getItem('focusComments') === '1') {
        sessionStorage.removeItem('focusComments');
        this._focusCommentSection();
      }

      console.log(`📄 Vista de detalle inicializada para artículo ${articleId}`);
    } catch (error) {
      console.error('❌ Error inicializando vista de detalle:', error);
      this._renderError(error.message);
    }
  },

  /**
   * Abre la primera sección de comentarios y hace scroll hasta ella.
   * Se llama cuando el usuario navega desde el botón "Comentar".
   */
  _focusCommentSection() {
    // Abrir la primera sección disponible
    const firstSection = this._container.querySelector('.comment-section');
    if (!firstSection) return;

    const sectionName = firstSection.dataset.section;
    if (sectionName) {
      // Abrir el dropdown de la primera sección
      const content = document.getElementById(`section-${sectionName}`);
      const icon = firstSection.querySelector('.toggle-icon');
      if (content) {
        content.style.display = 'block';
        if (icon) icon.textContent = '▲';
      }
    }

    // Scroll suave hasta la sección
    setTimeout(() => {
      firstSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  },

  /**
   * Carga datos del artículo
   */
  async _loadArticle(articleId) {
    try {
      this._article = await ArticleManager.getById(articleId);
      if (!this._article) {
        throw new Error('Artículo no encontrado');
      }
    } catch (error) {
      console.error('❌ Error cargando artículo:', error);
      throw error;
    }
  },

  /**
   * Carga comentarios del artículo
   */
  async _loadComments(articleId) {
    try {
      console.log(`📝 Cargando comentarios para artículo: ${articleId}`);
      const comments = await CommentManager.getComments(articleId);

      // Verificar que comments sea un array
      if (!Array.isArray(comments)) {
        console.warn('⚠️ _loadComments: comentarios no es un array:', comments);
        this._comments = [];
        return;
      }

      console.log(`📝 Se encontraron ${comments.length} comentarios`);
      this._comments = CommentManager.formatCommentsForDisplay(comments);
      console.log(`📝 Comentarios formateados: ${this._comments.length}`);
    } catch (error) {
      console.error('❌ Error cargando comentarios:', error);
      this._comments = [];
    }
  },

  /**
   * Renderiza la vista completa
   */
  _render() {
    if (!this._article) return;

    const user = AuthManager.getCurrentUser();
    const canChangeStatus = AuthManager.canPerformAction('approve_reject', this._article.status);

    this._container.innerHTML = `
      <div class="article-detail">
        ${this._renderArticleHeader()}
        ${this._renderArticleContent()}
        ${canChangeStatus ? this._renderStatusActions() : ''}
      </div>
    `;

    this._setupEventListeners();
  },

  /**
   * Renderiza encabezado del artículo
   */
  _renderArticleHeader() {
    const statusClass = this._getStatusClass(this._article.status);
    return `
      <div class="article-header">
        <div class="article-title-section">
          <h1 class="article-title">${this._escapeHtml(this._article.title)}</h1>
          <span class="article-status ${statusClass}">${this._article.status}</span>
        </div>
        <div class="article-meta">
          <p class="article-date">
            Creado: ${new Date(this._article.createdAt).toLocaleDateString('es-ES')}
          </p>
          <p class="article-updated">
            Actualizado: ${new Date(this._article.updatedAt).toLocaleDateString('es-ES')}
          </p>
          ${this._article.file ? `
            <p class="article-file">📄 ${this._escapeHtml(this._article.file.name)}</p>
          ` : ''}
        </div>
      </div>
    `;
  },

  /**
   * Renderiza contenido del artículo
   */
  _renderArticleContent() {
    const user = AuthManager.getCurrentUser();

    // Verificar que el usuario exista
    if (!user) {
      console.error('❌ No hay usuario autenticado');
      return `
        <div class="error-message">
          <h2>❌ Error</h2>
          <p>No hay usuario autenticado</p>
          <a href="login.html" class="btn btn--primary">Iniciar Sesión</a>
        </div>
      `;
    }

    const isAuthor = user.role === 'Autor';

    return `
      <div class="article-content">
        ${isAuthor ? this._renderAuthorView() : this._renderReviewerView()}
      </div>
    `;
  },

  /**
   * Renderiza vista para autor (solo comentarios en dropdowns)
   */
  _renderAuthorView() {
    return `
      <div class="author-view">
        <div class="comment-sections">
          ${this._renderAuthorCommentSections()}
        </div>
      </div>
    `;
  },

  /**
   * Renderiza secciones de comentarios para autor (solo lectura)
   */
  _renderAuthorCommentSections() {
    const sections = [
      'introduccion',
      'metodologia',
      'resultados',
      'discusion',
      'conclusiones',
      'referencias',
      'otros'
    ];

    return sections.map(section => {
      const sectionComments = this._comments.filter(comment =>
        comment.sections && comment.sections[section]
      );

      // Solo mostrar sección si tiene comentarios
      if (sectionComments.length === 0) {
        return '';
      }

      return `
        <div class="comment-section" data-section="${section}">
          <div class="section-header" onclick="ArticleDetail._toggleSection('${section}')">
            <h3 class="section-title">
              ${this._formatSectionName(section)}
              <span class="toggle-icon">▼</span>
              <span class="comment-count">(${sectionComments.length})</span>
            </h3>
          </div>
          <div class="section-content" id="section-${section}" style="display: none;">
            <div class="existing-section-comments">
              ${sectionComments.map(comment => this._renderSectionComment(comment, section)).join('')}
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  /**
   * Renderiza comentario de sección específica para autor
   */
  _renderSectionComment(comment, sectionName) {
    const commentText = comment.sections[sectionName];
    if (!commentText) return '';

    return `
      <div class="section-comment-item">
        <div class="section-comment-header">
          <div class="section-comment-author">
            <span class="author-name">${comment.authorDisplay}</span>
            <span class="author-role">${comment.authorRole}</span>
            <span class="comment-time">${comment.timeAgo}</span>
          </div>
        </div>
        <div class="section-comment-text">
          ${this._escapeHtml(commentText)}
        </div>
      </div>
    `;
  },

  /**
   * Renderiza vista para revisor/editor (dropdowns para comentar)
   */
  _renderReviewerView() {
    return `
      <div class="reviewer-view">
        <div class="comment-sections">
          ${this._renderCommentSections()}
        </div>
        <div class="existing-comments">
          <button class="btn btn--secondary" onclick="ArticleDetail._toggleExistingComments()">
            📝 Ver Comentarios Existentes (${this._comments.length})
          </button>
          <div class="comments-list" id="existingCommentsList" style="display: none;">
            ${this._renderComments()}
          </div>
        </div>
      </div>
    `;
  },

  /**
   * Renderiza secciones de comentarios como dropdowns
   */
  _renderCommentSections() {
    const sections = [
      'introduccion',
      'metodologia',
      'resultados',
      'discusion',
      'conclusiones',
      'referencias',
      'otros'
    ];

    return sections.map(section => `
      <div class="comment-section" data-section="${section}">
        <div class="section-header" onclick="ArticleDetail._toggleSection('${section}')">
          <h3 class="section-title">
            ${this._formatSectionName(section)}
            <span class="toggle-icon">▼</span>
          </h3>
        </div>
        <div class="section-content" id="section-${section}" style="display: none;">
          <div class="existing-section-comments">
            ${this._getSectionComments(section)}
          </div>
          <div class="comment-input">
            <textarea 
              id="comment-${section}"
              placeholder="Agregar comentario sobre ${this._formatSectionName(section)}..."
              rows="3"
            ></textarea>
            <button class="btn btn--primary" onclick="ArticleDetail._addSectionComment('${section}')">
              💬 Agregar Comentario
            </button>
          </div>
        </div>
      </div>
    `).join('');
  },

  /**
   * Obtiene comentarios de una sección específica
   */
  _getSectionComments(sectionName) {
    const sectionComments = this._comments.filter(comment =>
      comment.formattedSections && comment.formattedSections[sectionName]
    );

    if (sectionComments.length === 0) {
      return '<p class="no-comments">No hay comentarios en esta sección</p>';
    }

    return `
      <div class="section-comments">
        ${sectionComments.map(comment => `
          <div class="section-comment" data-comment-id="${comment.id}">
            <div class="comment-header">
              <span class="comment-author">${comment.authorDisplay}</span>
              <span class="comment-time">${comment.timeAgo}</span>
            </div>
            <div class="comment-content">
              ${this._escapeHtml(comment.formattedSections[sectionName].comment)}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  },

  /**
   * Renderiza acciones de estado
   */
  _renderStatusActions() {
    return `
      <div class="status-actions">
        <h3>Acciones de Revisión</h3>
        <div class="action-buttons">
          <button class="action-btn review-btn" onclick="ArticleDetail._changeStatus('En Revisión')">
            🔄 Enviar a Revisión
          </button>
          <button class="action-btn approve-btn" onclick="ArticleDetail._changeStatus('Aceptado')">
            ✅ Aceptar Artículo
          </button>
          <button class="action-btn reject-btn" onclick="ArticleDetail._showRejectDialog()">
            ❌ Rechazar Artículo
          </button>
        </div>
      </div>
    `;
  },

  /**
   * Renderiza lista de comentarios
   */
  _renderComments() {
    if (this._comments.length === 0) {
      return `
        <div class="comments-section">
          <h3>No hay comentarios aún</h3>
        </div>
      `;
    }

    return `
      <div class="comments-section">
        <h3>Comentarios Generales (${this._comments.length})</h3>
        <div class="comments-list">
          ${this._comments.map(comment => this._renderComment(comment)).join('')}
        </div>
      </div>
    `;
  },

  /**
   * Renderiza un comentario individual
   */
  _renderComment(comment) {
    return `
      <div class="comment-item" data-comment-id="${comment.id}">
        <div class="comment-header">
          <div class="comment-author-info">
            <span class="comment-author">${comment.authorDisplay}</span>
            <span class="comment-time">${comment.timeAgo}</span>
          </div>
          <div class="comment-actions">
            ${this._renderCommentActions(comment)}
          </div>
        </div>
        ${comment.content ? `
          <div class="comment-content">
            ${this._escapeHtml(comment.content)}
          </div>
        ` : ''}
        ${Object.keys(comment.formattedSections || {}).length > 0 ? `
          <div class="comment-sections">
            <h4>Comentarios por Sección:</h4>
            ${Object.entries(comment.formattedSections).map(([section, data]) => `
              <div class="comment-section-item">
                <strong>${data.displayName}:</strong>
                <p>${this._escapeHtml(data.comment)}</p>
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>
    `;
  },

  /**
   * Renderiza acciones de comentario
   */
  _renderCommentActions(comment) {
    const user = AuthManager.getCurrentUser();
    if (comment.authorId !== user.id && user.role !== 'Editor') {
      return '';
    }

    return `
      <button class="comment-action-btn" onclick="ArticleDetail._editComment('${comment.id}')">
        ✏️
      </button>
      <button class="comment-action-btn" onclick="ArticleDetail._deleteComment('${comment.id}')">
        🗑️
      </button>
    `;
  },

  /**
   * Configura event listeners
   */
  _setupEventListeners() {
    // No hay formulario general que configurar
    // Los eventos se manejan por sección individualmente
  },

  /**
   * Renderiza error
   */
  _renderError(message) {
    this._container.innerHTML = `
      <div class="error-message">
        <h2>❌ Error</h2>
        <p>${message}</p>
        <button onclick="history.back()" class="btn btn--primary">Volver</button>
      </div>
    `;
  },

  /**
   * Cambia el estado del artículo
   */
  async _changeStatus(newStatus) {
    try {
      await ArticleManager.update(this._article.id, { status: newStatus });

      // Actualizar artículo local
      this._article.status = newStatus;
      this._article.updatedAt = new Date().toISOString();

      // Re-renderizar
      this._render();

      Toast.success(`Artículo ${newStatus.toLowerCase()}`);
    } catch (error) {
      console.error('❌ Error cambiando estado:', error);
    }
  },

  /**
   * Muestra diálogo de rechazo
   */
  _showRejectDialog() {
    const reason = prompt('Motivo del rechazo:');
    if (reason) {
      this._changeStatus('Rechazado');
      // Aquí podrías guardar el motivo del rechazo
    }
  },

  /**
   * Edita un comentario
   */
  async _editComment(commentId) {
    // Implementar edición de comentarios
    console.log('Editar comentario:', commentId);
  },

  /**
   * Elimina un comentario
   */
  async _deleteComment(commentId) {
    if (!confirm('¿Estás seguro de eliminar este comentario?')) {
      return;
    }

    try {
      await CommentManager.deleteComment(commentId);

      // Recargar comentarios
      await this._loadComments(this._article.id);
      this._render();

    } catch (error) {
      console.error('❌ Error eliminando comentario:', error);
    }
  },

  /**
   * Renderiza error
   */
  _renderError(message) {
    this._container.innerHTML = `
      <div class="error-message">
        <h2>❌ Error</h2>
        <p>${message}</p>
        <button onclick="history.back()" class="btn btn--primary">Volver</button>
      </div>
    `;
  },

  /**
   * Obtiene clase CSS para estado
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
   * Formatea nombre de sección
   */
  _formatSectionName(sectionName) {
    return sectionName
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  },

  /**
   * Escapa HTML
   */
  _escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  /**
   * Toggle para mostrar/ocultar comentarios (autor)
   */
  _toggleComments() {
    const commentsList = document.getElementById('commentsList');
    if (commentsList) {
      commentsList.style.display = commentsList.style.display === 'none' ? 'block' : 'none';
    }
  },

  /**
   * Toggle para mostrar/ocultar comentarios existentes (revisor)
   */
  _toggleExistingComments() {
    const commentsList = document.getElementById('existingCommentsList');
    if (commentsList) {
      commentsList.style.display = commentsList.style.display === 'none' ? 'block' : 'none';
    }
  },

  /**
   * Toggle para mostrar/ocultar sección específica
   */
  _toggleSection(sectionName) {
    const sectionContent = document.getElementById(`section-${sectionName}`);
    const toggleIcon = document.querySelector(`[data-section="${sectionName}"] .toggle-icon`);

    if (sectionContent) {
      const isVisible = sectionContent.style.display !== 'none';
      sectionContent.style.display = isVisible ? 'none' : 'block';
      if (toggleIcon) {
        toggleIcon.textContent = isVisible ? '▼' : '▲';
      }
    }
  },

  /**
   * Agregar comentario a sección específica
   */
  async _addSectionComment(sectionName) {
    try {
      const textarea = document.getElementById(`comment-${sectionName}`);
      const commentText = textarea.value.trim();

      if (!commentText) {
        Toast.warning('Debes escribir un comentario');
        return;
      }

      const sections = {};
      sections[sectionName] = commentText;

      await CommentManager.addComment(this._article.id, { sections });

      // Limpiar textarea
      textarea.value = '';

      // Recargar comentarios
      await this._loadComments(this._article.id);
      this._render();

      Toast.success('Comentario agregado correctamente');

    } catch (error) {
      console.error('❌ Error agregando comentario:', error);
      Toast.error('Error al agregar comentario');
    }
  }
};

// Hacer disponible globalmente para onclick
window.ArticleDetail = ArticleDetail;
