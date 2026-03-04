/**
 * components/SyncEngine.js
 * Motor de sincronización offline-first
 */

import { SyncDB } from '../db/SyncDB.js';
import { ArticleDB } from '../db/ArticleDB.js';

// API URL dinámica basada en el host actual
const getApiUrl = () => {
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
    return 'http://localhost:3001';
  }
  return 'http://10.21.60.67:8000';  // IP fija de tu laptop
};

export const SyncEngine = {
  _isOnline: navigator.onLine,
  _isSyncing: false,
  _syncInterval: null,

  /**
   * Inicializa el motor de sincronización
   */
  async init() {
    console.log('🔄 SyncEngine inicializado');
    console.log('📡 API URL:', getApiUrl());

    // Escuchar cambios de conectividad
    window.addEventListener('online', () => {
      console.log('🌐 Conexión restaurada');
      this._isOnline = true;
      this.syncPendingChanges();
    });

    window.addEventListener('offline', () => {
      console.log('📴 Conexión perdida');
      this._isOnline = false;
    });

    // Intentar sincronizar al iniciar si hay conexión
    if (this._isOnline) {
      await this.syncPendingChanges();
    }

    // Configurar sincronización periódica (cada 30 segundos)
    this._syncInterval = setInterval(() => {
      if (this._isOnline && !this._isSyncing) {
        this.syncPendingChanges();
      }
    }, 30000);
  },

  /**
   * Sincroniza cambios pendientes con el servidor
   */
  async syncPendingChanges() {
    if (this._isSyncing || !this._isOnline) return;

    this._isSyncing = true;
    console.log('📤 Iniciando sincronización...');

    try {
      // 1. PRIMERO: Descargar cambios del servidor (siempre)
      await this.fetchServerChanges();

      // 2. Luego, subir operaciones pendientes locales
      const pendingOps = await SyncDB.getPendingOperations();

      if (pendingOps.length > 0) {
        console.log(`📦 Enviando ${pendingOps.length} cambios al servidor...`);

        const articlesToSync = pendingOps.map(op => ({
          ...op.article,
          _operation: op.operation
        }));

        const response = await fetch(`${getApiUrl()}/sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ articles: articlesToSync })
        });

        if (!response.ok) {
          throw new Error(`Error del servidor: ${response.status}`);
        }

        const result = await response.json();

        if (result.success) {
          await SyncDB.markAsSynced(pendingOps.map(op => op.id));
          await SyncDB.cleanOldOperations();

          console.log('✅ Sincronización completada');

          // Actualizar artículos locales con datos del servidor
          await this.updateLocalArticles(result.articles);

          window.dispatchEvent(new CustomEvent('articlesSynced', {
            detail: { count: pendingOps.length }
          }));
        }
      } else {
        console.log('✅ No hay cambios locales pendientes');
      }

    } catch (error) {
      console.error('❌ Error en sincronización:', error.message);
    } finally {
      this._isSyncing = false;
    }
  },

  /**
   * Obtiene cambios del servidor
   */
  async fetchServerChanges() {
    try {
      console.log('📥 Obteniendo cambios del servidor...');
      console.log(`📡 URL: ${getApiUrl()}/articles`);

      const response = await fetch(`${getApiUrl()}/articles`);

      console.log(`📡 Respuesta status: ${response.status}`);

      if (!response.ok) {
        throw new Error(`Error del servidor: ${response.status}`);
      }

      const serverArticles = await response.json();
      console.log(`📡 Artículos recibidos: ${serverArticles.length}`);

      await this.updateLocalArticles(serverArticles);

      console.log(`✅ ${serverArticles.length} artículos actualizados del servidor`);

    } catch (error) {
      console.error('❌ Error obteniendo cambios del servidor:', error.message);
      throw error;
    }
  },

  /**
   * Actualiza artículos locales con datos del servidor
   * Mantiene el último cambio (estrategia "last write wins")
   */
  async updateLocalArticles(serverArticles) {
    for (const serverArticle of serverArticles) {
      try {
        const localArticle = {
          id: serverArticle.id,
          title: serverArticle.title,
          file: serverArticle.file,
          status: serverArticle.status,
          createdAt: serverArticle.created_at,
          updatedAt: serverArticle.updated_at,
          rejectionReason: serverArticle.rejection_reason
        };

        const localExisting = await ArticleDB.getById(localArticle.id);

        if (!localExisting) {
          await ArticleDB.save(localArticle);
          console.log(`⬇️ Artículo descargado: ${localArticle.title}`);
        } else {
          const serverTime = new Date(localArticle.updatedAt).getTime();
          const localTime = new Date(localExisting.updatedAt).getTime();

          if (serverTime > localTime) {
            await ArticleDB.save(localArticle);
            console.log(`🔄 Artículo actualizado del servidor: ${localArticle.title}`);
          }
        }

      } catch (error) {
        console.error(`Error actualizando artículo ${serverArticle.id}:`, error);
      }
    }
  },

  /**
   * Fuerza sincronización manual
   */
  async forceSync() {
    if (!this._isOnline) {
      console.log('📴 Sin conexión. Los cambios se sincronizarán cuando haya internet.');
      return false;
    }

    await this.syncPendingChanges();
    return true;
  },

  /**
   * Obtiene estado de sincronización
   */
  getStatus() {
    return {
      isOnline: this._isOnline,
      isSyncing: this._isSyncing,
      pendingCount: SyncDB.getPendingCount()
    };
  },

  /**
   * Detiene el motor de sincronización
   */
  stop() {
    if (this._syncInterval) {
      clearInterval(this._syncInterval);
      this._syncInterval = null;
    }
    console.log('🛑 SyncEngine detenido');
  }
};