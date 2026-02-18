/**
 * components/ArticleManager.js
 * Maneja la lógica de negocio para artículos académicos.
 */

import { ArticleDB } from '../db/ArticleDB.js';

/** Estados válidos del ciclo de revisión */
export const ArticleStatus = Object.freeze({
  RECEIVED:   'Recibido',
  IN_REVIEW:  'En revisión',
  REVIEWED:   'Revisado',
  ACCEPTED:   'Aceptado',
  REJECTED:   'Rechazado',
});

/** Genera un id único simple (timestamp + random) */
function generateId() {
  return `art_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Serializa el File a un objeto plano que IndexedDB puede almacenar.
 * Guarda nombre, tipo y tamaño (el binario se omite en esta versión MVP).
 */
function serializeFile(file) {
  if (!file) return null;
  return {
    name:         file.name,
    type:         file.type,
    size:         file.size,
    lastModified: file.lastModified,
  };
}

export const ArticleManager = {
  /**
   * Crea un nuevo artículo y lo persiste.
   * @param {{ title: string, file: File }} data
   * @returns {Promise<Article>}
   */
  async create({ title, file }) {
    const article = {
      id:        generateId(),
      title:     title.trim(),
      file:      serializeFile(file),
      status:    ArticleStatus.RECEIVED,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return ArticleDB.save(article);
  },

  /**
   * Edita un artículo existente y lo persiste.
   * Solo actualiza los campos editables: título y archivo (si se cambia).
   * @param {string} id
   * @param {{ title: string, file?: File }} data
   * @returns {Promise<Article>}
   */
  async update(id, { title, file }) {
    const existing = await ArticleDB.getById(id);
    if (!existing) throw new Error(`Artículo con id "${id}" no encontrado.`);

    const updated = {
      ...existing,
      title:     title.trim(),
      file:      file ? serializeFile(file) : existing.file,
      updatedAt: new Date().toISOString(),
    };
    return ArticleDB.save(updated);
  },

  /**
   * Obtiene un artículo por id.
   * @param {string} id
   * @returns {Promise<Article|undefined>}
   */
  async getById(id) {
    return ArticleDB.getById(id);
  },

  /**
   * Devuelve todos los artículos.
   * @returns {Promise<Article[]>}
   */
  async getAll() {
    return ArticleDB.getAll();
  },

  /**
   * Elimina un artículo por id.
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  async delete(id) {
    return ArticleDB.deleteById(id);
  },
};