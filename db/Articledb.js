/**
 * db/ArticleDB.js
 * Wrapper minimalista sobre IndexedDB para artículos académicos.
 */

const DB_NAME = 'PeerReviewDB';
const DB_VERSION = 3;
const STORE_NAME = 'articles';
const COMMENTS_STORE = 'comments';

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }

      if (!db.objectStoreNames.contains(COMMENTS_STORE)) {
        const commentStore = db.createObjectStore(COMMENTS_STORE, { keyPath: 'id' });
        commentStore.createIndex('articleId', 'articleId', { unique: false });
        commentStore.createIndex('authorId', 'authorId', { unique: false });
      }
    };

    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror = (event) => reject(event.target.error);
  });
}

export const ArticleDB = {
  /** Guarda o actualiza un artículo. */
  async save(article) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const request = tx.objectStore(STORE_NAME).put(article);
      request.onsuccess = () => resolve(article);
      request.onerror = (e) => reject(e.target.error);
    });
  },

  /**
   * Guarda un artículo del servidor aplicando "last write wins".
   * Convierte el formato snake_case del servidor a camelCase local.
   */
  async saveWithConflictResolution(serverArticle) {
    // Normalizar formato servidor → local
    const incoming = {
      id: serverArticle.id,
      title: serverArticle.title,
      file: serverArticle.file,
      status: serverArticle.status,
      createdAt: serverArticle.created_at ?? serverArticle.createdAt,
      updatedAt: serverArticle.updated_at ?? serverArticle.updatedAt,
      rejectionReason: serverArticle.rejection_reason ?? serverArticle.rejectionReason ?? null,
    };

    const existing = await this.getById(incoming.id);

    if (!existing) {
      // Artículo nuevo — guardar directamente
      await this.save(incoming);
      console.log(`⬇️ Artículo nuevo del servidor: ${incoming.title}`);
      return true; // cambio real → contabilizar
    }

    // Comparar timestamps — mantener el más reciente
    const serverTime = new Date(incoming.updatedAt).getTime();
    const localTime = new Date(existing.updatedAt).getTime();

    if (serverTime > localTime) {
      await this.save(incoming);
      console.log(`🔄 Artículo actualizado del servidor: ${incoming.title}`);
      return true; // cambio real → contabilizar
    }

    console.log(`✅ Local más reciente, sin cambios: ${existing.title}`);
    return false; // sin cambio → NO contabilizar
  },

  /** Obtiene un artículo por id. Devuelve undefined si no existe. */
  async getById(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const request = tx.objectStore(STORE_NAME).get(id);
      request.onsuccess = (e) => resolve(e.target.result);
      request.onerror = (e) => reject(e.target.error);
    });
  },

  /** Devuelve todos los artículos ordenados por fecha desc. */
  async getAll() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const request = tx.objectStore(STORE_NAME).getAll();
      request.onsuccess = (e) => {
        const sorted = e.target.result.sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );
        resolve(sorted);
      };
      request.onerror = (e) => reject(e.target.error);
    });
  },

  /** Elimina un artículo por id. */
  async deleteById(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const request = tx.objectStore(STORE_NAME).delete(id);
      request.onsuccess = () => resolve(true);
      request.onerror = (e) => reject(e.target.error);
    });
  },

  /** Guarda o actualiza un comentario. */
  async saveComment(comment) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(COMMENTS_STORE, 'readwrite');
      const request = tx.objectStore(COMMENTS_STORE).put(comment);
      request.onsuccess = () => resolve(comment);
      request.onerror = (e) => reject(e.target.error);
    });
  },

  /** Obtiene un comentario por id. */
  async getCommentById(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(COMMENTS_STORE, 'readonly');
      const request = tx.objectStore(COMMENTS_STORE).get(id);
      request.onsuccess = (e) => resolve(e.target.result);
      request.onerror = (e) => reject(e.target.error);
    });
  },

  /** Obtiene comentarios de un artículo. */
  async getCommentsByArticle(articleId) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(COMMENTS_STORE, 'readonly');
      const store = tx.objectStore(COMMENTS_STORE);
      const index = store.index('articleId');
      const request = index.getAll(articleId);
      request.onsuccess = (e) => {
        const result = e.target.result;
        if (Array.isArray(result)) {
          const sorted = result.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
          resolve(sorted);
        } else {
          console.warn('⚠️ getCommentsByArticle: resultado no es array:', result);
          resolve([]);
        }
      };
      request.onerror = (e) => reject(e.target.error);
    });
  },

  /** Elimina un comentario por id. */
  async deleteComment(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(COMMENTS_STORE, 'readwrite');
      const request = tx.objectStore(COMMENTS_STORE).delete(id);
      request.onsuccess = () => resolve(true);
      request.onerror = (e) => reject(e.target.error);
    });
  },
};