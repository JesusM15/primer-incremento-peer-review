/**
 * components/ArticleManager.js
 * Maneja la lógica de negocio para artículos académicos.
 */

import { ArticleDB } from '../db/ArticleDB.js';
import { SyncDB } from '../db/SyncDB.js';
import { Toast } from './Toast.js';

/** Estados válidos del ciclo de revisión */
export const ArticleStatus = Object.freeze({
  RECEIVED:   'Recibido',
  IN_REVIEW:  'En Revisión',
  APPROVED:   'Aceptado',
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
    
    // Guardar localmente
    const savedArticle = await ArticleDB.save(article);
    console.log('✅ Artículo guardado localmente:', savedArticle);
    
    // Agregar a cola de sincronización
    try {
      await SyncDB.addOperation('CREATE', savedArticle);
      console.log('📤 Artículo agregado a cola de sincronización');
    } catch (syncError) {
      console.warn('⚠️ Error al agregar a cola de sincronización:', syncError);
    }
    
    Toast.success('Artículo creado correctamente');
    
    return savedArticle;
  },

  /**
   * Edita un artículo existente y lo persiste.
   * Solo actualiza los campos editables: título y archivo (si se cambia).
   * @param {string} id
   * @param {{ title: string, file?: File }} data
   * @returns {Promise<Article>}
   */
  async update(id, { title, file, status, rejectionReason }) {
    const existing = await ArticleDB.getById(id);
    if (!existing) throw new Error(`Artículo con id "${id}" no encontrado.`);

    const updated = {
      ...existing,
      title: title ? title.trim() : existing.title,
      file: file ? serializeFile(file) : existing.file,
      status: status || existing.status,
      rejectionReason: rejectionReason || existing.rejectionReason,
      updatedAt: new Date().toISOString(),
    };
    
    // Actualizar localmente
    const savedArticle = await ArticleDB.save(updated);
    console.log('✅ Artículo actualizado localmente:', savedArticle);
    
    // Agregar a cola de sincronización
    try {
      await SyncDB.addOperation('UPDATE', savedArticle);
      console.log('📤 Artículo agregado a cola de sincronización');
    } catch (syncError) {
      console.warn('⚠️ Error al agregar a cola de sincronización:', syncError);
    }
    
    Toast.success('Artículo actualizado correctamente');
    
    return savedArticle;
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
    const existing = await ArticleDB.getById(id);
    if (!existing) return false;
    
    // Eliminar localmente
    await ArticleDB.deleteById(id);
    console.log('🗑️ Artículo eliminado localmente:', id);
    
    // Agregar a cola de sincronización
    try {
      await SyncDB.addOperation('DELETE', { id, deletedAt: new Date().toISOString() });
      console.log('📤 Eliminación agregada a cola de sincronización');
    } catch (syncError) {
      console.warn('⚠️ Error al agregar a cola de sincronización:', syncError);
    }
    
    Toast.success('Artículo eliminado correctamente');
    
    return true;
  },
};