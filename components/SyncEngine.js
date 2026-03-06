/**
 * components/SyncEngine.js
 * Motor de sincronización manual (sin auto-sync)
 */

import { SyncDB } from '../db/SyncDB.js';
import { ArticleDB } from '../db/ArticleDB.js';
import { CommentManager } from './CommentManager.js';
import { RequestBatcher } from './RequestBatcher.js';

const getApiUrl = () => location.origin;


export const SyncEngine = {
  _isOnline: navigator.onLine,
  _isSyncing: false,

  /**
   * Inicializa — solo escucha conectividad, sin auto-sync ni intervalos
   */
  async init() {
    console.log('🔄 SyncEngine inicializado (modo manual)');
    console.log('📡 API URL:', getApiUrl());

    RequestBatcher.init();

    window.addEventListener('online', () => {
      this._isOnline = true;
      console.log('🌐 Conexión restaurada');
    });

    window.addEventListener('offline', () => {
      this._isOnline = false;
      console.log('📴 Conexión perdida');
    });
  },

  /**
   * Sincronización completa: baja del servidor + sube cambios locales.
   * Llamar desde el botón flotante.
   */
  async sync() {
    if (this._isSyncing) {
      return { success: false, message: 'Ya hay una sincronización en curso' };
    }
    if (!this._isOnline) {
      return { success: false, message: 'Sin conexión al servidor' };
    }

    this._isSyncing = true;
    console.log('🔄 Iniciando sincronización manual...');

    try {
      const downloaded = await this._fetchServerChanges();
      const uploaded = await this._pushLocalChanges();

      console.log(`✅ Sync completo — bajados: ${downloaded}, subidos: ${uploaded}`);

      window.dispatchEvent(new CustomEvent('articlesSynced', {
        detail: { downloaded, uploaded }
      }));

      return {
        success: true,
        message: `Sincronizado: ${downloaded} bajados, ${uploaded} subidos`,
        downloaded,
        uploaded
      };
    } catch (error) {
      console.error('❌ Error en sincronización:', error.message);
      return { success: false, message: `Error: ${error.message}` };
    } finally {
      this._isSyncing = false;
    }
  },

  async _fetchServerChanges() {
    let count = 0;

    // Artículos
    const artResponse = await RequestBatcher.addRequest({
      method: 'GET',
      url: `${getApiUrl()}/articles`,
      headers: { 'Cache-Control': 'no-cache' }
    });

    if (!artResponse.ok) throw new Error(`Error descargando artículos: ${artResponse.status}`);

    const payload = artResponse.data;
    const serverArticles = Array.isArray(payload) ? payload : (payload?.articles ?? []);

    for (const article of serverArticles) {
      const changed = await ArticleDB.saveWithConflictResolution(article);
      if (changed) count++;
    }
    console.log(`📥 ${serverArticles.length} artículos descargados`);

    // Comentarios
    const commentResponse = await RequestBatcher.addRequest({
      method: 'GET',
      url: `${getApiUrl()}/comments`,
      headers: { 'Cache-Control': 'no-cache' }
    });

    if (commentResponse.ok) {
      const cPayload = commentResponse.data;
      const serverComments = Array.isArray(cPayload) ? cPayload : (cPayload?.comments ?? []);
      for (const comment of serverComments) {
        await CommentManager.syncCommentFromServer(comment);
      }
      console.log(`📥 ${serverComments.length} comentarios descargados`);
    }

    return count;
  },

  async _pushLocalChanges() {
    const pendingOps = await SyncDB.getPendingOperations();
    if (pendingOps.length === 0) {
      console.log('✅ No hay cambios locales pendientes');
      return 0;
    }

    console.log(`📤 Subiendo ${pendingOps.length} cambios locales...`);

    const commentOps = pendingOps.filter(op => op.operation.includes('COMMENT'));
    const articleOps = pendingOps.filter(op => !op.operation.includes('COMMENT'));

    if (articleOps.length > 0) {
      const response = await RequestBatcher.addRequest({
        method: 'POST',
        url: `${getApiUrl()}/sync`,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articles: articleOps.map(op => ({ ...op.article, _operation: op.operation })) })
      });

      if (!response.ok) throw new Error(`Error subiendo artículos: ${response.status}`);

      if (response.data?.success) {
        await SyncDB.markAsSynced(articleOps.map(op => op.id));
        if (response.data.articles) {
          for (const a of response.data.articles) await ArticleDB.saveWithConflictResolution(a);
        }
        console.log(`📤 ${articleOps.length} artículos subidos`);
      }
    }

    if (commentOps.length > 0) {
      const commentResponse = await RequestBatcher.addRequest({
        method: 'POST',
        url: `${getApiUrl()}/sync/comments`,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comments: commentOps.map(op => ({ ...op.article, _operation: op.operation })) })
      });

      if (commentResponse.ok && !commentResponse.data?.error) {
        await SyncDB.markAsSynced(commentOps.map(op => op.id));
        console.log(`📤 ${commentOps.length} comentarios subidos`);
      }
    }

    await SyncDB.cleanOldOperations();
    return pendingOps.length;
  },

  getStatus() {
    return { isOnline: this._isOnline, isSyncing: this._isSyncing };
  },

  // Compatibilidad con código existente que use forceSync()
  async forceSync() {
    return this.sync();
  },

  // Compatibilidad con código existente que use syncPendingChanges()
  async syncPendingChanges() {
    return this.sync();
  },

  stop() {
    RequestBatcher.stop();
    console.log('🛑 SyncEngine detenido');
  }
};