/**
 * db/ArticleDB.js
 * Wrapper minimalista sobre IndexedDB para artículos académicos.
 */

const DB_NAME    = 'PeerReviewDB';
const DB_VERSION = 2;
const STORE_NAME = 'articles';

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('status',    'status',    { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };

    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror   = (event) => reject(event.target.error);
  });
}

export const ArticleDB = {
  /** Guarda o actualiza un artículo. */
  async save(article) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx      = db.transaction(STORE_NAME, 'readwrite');
      const request = tx.objectStore(STORE_NAME).put(article);
      request.onsuccess = () => resolve(article);
      request.onerror   = (e) => reject(e.target.error);
    });
  },

  /** Obtiene un artículo por id. Devuelve undefined si no existe. */
  async getById(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx      = db.transaction(STORE_NAME, 'readonly');
      const request = tx.objectStore(STORE_NAME).get(id);
      request.onsuccess = (e) => resolve(e.target.result);
      request.onerror   = (e) => reject(e.target.error);
    });
  },

  /** Devuelve todos los artículos ordenados por fecha desc. */
  async getAll() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx      = db.transaction(STORE_NAME, 'readonly');
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
      const tx      = db.transaction(STORE_NAME, 'readwrite');
      const request = tx.objectStore(STORE_NAME).delete(id);
      request.onsuccess = () => resolve(true);
      request.onerror   = (e) => reject(e.target.error);
    });
  },
};