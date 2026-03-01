/**
 * db/SyncDB.js
 * Maneja la cola de operaciones pendientes de sincronización en IndexedDB
 */

const SYNC_DB_NAME = 'PeerReviewSyncDB';
const SYNC_DB_VERSION = 1;
const SYNC_STORE = 'sync_queue';

function openSyncDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(SYNC_DB_NAME, SYNC_DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(SYNC_STORE)) {
        const store = db.createObjectStore(SYNC_STORE, { keyPath: 'id', autoIncrement: true });
        store.createIndex('articleId', 'articleId', { unique: false });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };

    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror = (event) => reject(event.target.error);
  });
}

export const SyncDB = {
  /**
   * Agrega una operación a la cola de sincronización
   * @param {string} operation - 'CREATE', 'UPDATE', 'DELETE'
   * @param {object} article - Datos del artículo
   * @returns {Promise<object>} La operación guardada
   */
  async addOperation(operation, article) {
    const db = await openSyncDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(SYNC_STORE, 'readwrite');
      const store = tx.objectStore(SYNC_STORE);

      // Buscar si ya existe una operación pendiente para este artículo
      const index = store.index('articleId');
      const request = index.getAll(article.id);

      request.onsuccess = () => {
        const existingOps = request.result.filter(op => op.status === 'pending');

        if (existingOps.length > 0) {
          // Actualizar operación existente (conservar solo el último cambio)
          const existingOp = existingOps[0];
          existingOp.operation = operation;
          existingOp.article = article;
          existingOp.timestamp = new Date().toISOString();
          
          const updateRequest = store.put(existingOp);
          updateRequest.onsuccess = () => resolve(existingOp);
          updateRequest.onerror = (e) => reject(e.target.error);
        } else {
          // Crear nueva operación
          const syncOp = {
            operation,
            articleId: article.id,
            article,
            status: 'pending',
            timestamp: new Date().toISOString(),
            retryCount: 0
          };

          const addRequest = store.add(syncOp);
          addRequest.onsuccess = (e) => {
            syncOp.id = e.target.result;
            resolve(syncOp);
          };
          addRequest.onerror = (e) => reject(e.target.error);
        }
      };

      request.onerror = (e) => reject(e.target.error);
    });
  },

  /**
   * Obtiene todas las operaciones pendientes
   * @returns {Promise<Array>} Operaciones pendientes
   */
  async getPendingOperations() {
    const db = await openSyncDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(SYNC_STORE, 'readonly');
      const store = tx.objectStore(SYNC_STORE);
      const index = store.index('status');
      const request = index.getAll('pending');

      request.onsuccess = () => resolve(request.result);
      request.onerror = (e) => reject(e.target.error);
    });
  },

  /**
   * Marca operaciones como completadas
   * @param {Array<number>} ids - IDs de operaciones a marcar
   */
  async markAsSynced(ids) {
    const db = await openSyncDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(SYNC_STORE, 'readwrite');
      const store = tx.objectStore(SYNC_STORE);

      let completed = 0;
      ids.forEach(id => {
        const request = store.get(id);
        request.onsuccess = () => {
          const op = request.result;
          if (op) {
            op.status = 'synced';
            op.syncedAt = new Date().toISOString();
            store.put(op);
          }
          completed++;
          if (completed === ids.length) resolve();
        };
        request.onerror = (e) => reject(e.target.error);
      });
    });
  },

  /**
   * Elimina operaciones antiguas ya sincronizadas
   */
  async cleanOldOperations() {
    const db = await openSyncDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(SYNC_STORE, 'readwrite');
      const store = tx.objectStore(SYNC_STORE);
      const index = store.index('status');
      const request = index.getAll('synced');

      request.onsuccess = () => {
        const oldOps = request.result;
        let deleted = 0;
        
        oldOps.forEach(op => {
          const deleteRequest = store.delete(op.id);
          deleteRequest.onsuccess = () => {
            deleted++;
            if (deleted === oldOps.length) resolve(deleted);
          };
        });

        if (oldOps.length === 0) resolve(0);
      };

      request.onerror = (e) => reject(e.target.error);
    });
  },

  /**
   * Obtiene el conteo de operaciones pendientes
   */
  async getPendingCount() {
    const ops = await this.getPendingOperations();
    return ops.length;
  }
};
