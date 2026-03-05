/**
 * components/CommentManager.js
 * Gestiona comentarios de artículos con sincronización offline-first.
 * Los Toasts los muestra el componente visual (ArticleDetail), no este manager.
 */

import { SyncDB }     from '../db/SyncDB.js';
import { ArticleDB }  from '../db/ArticleDB.js';
import { AuthManager } from './AuthManager.js';

export const CommentManager = {

  /**
   * Agrega un comentario a un artículo
   */
  async addComment(articleId, comment) {
    const user = AuthManager.getCurrentUser();
    if (!user) throw new Error('Usuario no autenticado');

    const newComment = {
      id:         `comment_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      articleId,
      authorId:   user.id,
      authorName: user.name,
      authorRole: user.role,
      sections:   comment.sections || {},
      content:    comment.content  || '',
      createdAt:  new Date().toISOString(),
      updatedAt:  new Date().toISOString(),
      synced:     false
    };

    await ArticleDB.saveComment(newComment);
    await SyncDB.addOperation('CREATE_COMMENT', newComment);
    console.log('💬 Comentario agregado localmente:', newComment.id);
    return newComment;
  },

  /**
   * Obtiene comentarios de un artículo
   */
  async getComments(articleId) {
    try {
      const comments = await ArticleDB.getCommentsByArticle(articleId);
      console.log(`📝 ${comments.length} comentarios del artículo ${articleId}`);
      return comments;
    } catch (error) {
      console.error('❌ Error cargando comentarios:', error);
      return [];
    }
  },

  /**
   * Actualiza un comentario existente
   */
  async updateComment(commentId, updates) {
    const existingComment = await ArticleDB.getCommentById(commentId);
    if (!existingComment) throw new Error('Comentario no encontrado');

    const user = AuthManager.getCurrentUser();
    if (existingComment.authorId !== user.id && user.role !== 'Editor') {
      throw new Error('No tienes permisos para editar este comentario');
    }

    const updatedComment = {
      ...existingComment,
      ...updates,
      updatedAt: new Date().toISOString(),
      synced:    false
    };

    await ArticleDB.saveComment(updatedComment);
    await SyncDB.addOperation('UPDATE_COMMENT', updatedComment);
    console.log('✏️ Comentario actualizado:', updatedComment.id);
    return updatedComment;
  },

  /**
   * Elimina un comentario
   */
  async deleteComment(commentId) {
    const existingComment = await ArticleDB.getCommentById(commentId);
    if (!existingComment) throw new Error('Comentario no encontrado');

    const user = AuthManager.getCurrentUser();
    if (existingComment.authorId !== user.id && user.role !== 'Editor') {
      throw new Error('No tienes permisos para eliminar este comentario');
    }

    await ArticleDB.deleteComment(commentId);
    await SyncDB.addOperation('DELETE_COMMENT', {
      id:        commentId,
      deletedAt: new Date().toISOString()
    });
    console.log('🗑️ Comentario eliminado:', commentId);
    return true;
  },

  /**
   * Sincroniza un comentario del servidor → IndexedDB (last-write-wins)
   */
  async syncCommentFromServer(serverComment) {
    try {
      const localComment = {
        id:         serverComment.id,
        articleId:  serverComment.article_id,
        authorId:   serverComment.author_id,
        authorName: serverComment.author_name,
        authorRole: serverComment.author_role,
        sections:   serverComment.sections,
        content:    serverComment.content,
        createdAt:  serverComment.created_at,
        updatedAt:  serverComment.updated_at,
        synced:     true
      };

      const existing = await ArticleDB.getCommentById(localComment.id);

      if (!existing) {
        await ArticleDB.saveComment(localComment);
        console.log(`⬇️ Comentario nuevo del servidor: ${localComment.id}`);
        return;
      }

      const serverTime = new Date(localComment.updatedAt).getTime();
      const localTime  = new Date(existing.updatedAt).getTime();

      if (serverTime > localTime) {
        await ArticleDB.saveComment(localComment);
        console.log(`🔄 Comentario actualizado del servidor: ${localComment.id}`);
      } else if (localTime > serverTime) {
        await SyncDB.addOperation('UPDATE_COMMENT', existing);
        console.log(`⬆️ Comentario local más reciente, se subirá: ${localComment.id}`);
      }
    } catch (error) {
      console.error(`❌ Error sincronizando comentario ${serverComment.id}:`, error);
    }
  },

  /**
   * Formatea comentarios para visualización
   */
  formatCommentsForDisplay(comments) {
    if (!Array.isArray(comments)) return [];
    return comments
      .map(comment => ({
        ...comment,
        formattedSections: this._formatSections(comment.sections),
        authorDisplay:     `${comment.authorName} (${comment.authorRole})`,
        timeAgo:           this._getTimeAgo(comment.createdAt)
      }))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  parseSectionComments(text) {
    const sections = {};
    const sectionRegex = /"([^"]+)":\s*\[([^\]]+)\]/g;
    let match;
    while ((match = sectionRegex.exec(text)) !== null) {
      sections[match[1].trim()] = match[2].trim();
    }
    return sections;
  },

  generateSectionText(sections) {
    return Object.entries(sections)
      .map(([section, comment]) => `"${section}": [${comment}]`)
      .join('\n');
  },

  _formatSections(sections) {
    if (!sections || typeof sections !== 'object') return {};
    return Object.entries(sections).reduce((acc, [section, comment]) => {
      acc[section] = {
        name:        section,
        comment,
        displayName: this._formatSectionName(section)
      };
      return acc;
    }, {});
  },

  _formatSectionName(sectionName) {
    return sectionName
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  },

  _getTimeAgo(dateString) {
    const diffMs   = Date.now() - new Date(dateString).getTime();
    const diffMins  = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays  = Math.floor(diffMs / 86400000);

    if (diffMins  <  1) return 'ahora mismo';
    if (diffMins  < 60) return `hace ${diffMins} min`;
    if (diffHours < 24) return `hace ${diffHours} h`;
    if (diffDays  <  7) return `hace ${diffDays} días`;
    return new Date(dateString).toLocaleDateString('es-ES');
  }
};