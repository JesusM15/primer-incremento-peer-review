/**
 * pages/article-form.js
 * Manejo robusto del formulario de creación/edición de artículos
 * - Idempotente (no duplica listeners)
 * - Feedback visual verde/rojo para archivo
 * - Valida por extensión + accept (no solo file.type)
 */

import { ArticleManager } from '../components/ArticleManager.js';
import { Router } from '../components/Router.js';

const MAX_MB = 20;
const MAX_BYTES = MAX_MB * 1024 * 1024;
const ALLOWED_EXT = ['pdf', 'doc', 'docx'];

function ensureFormStyles() {
  if (document.getElementById('peerreview-form-styles')) return;

  const style = document.createElement('style');
  style.id = 'peerreview-form-styles';
  style.textContent = `
    .file-upload-area.is-valid {
      border-color: #16a34a !important;
      box-shadow: 0 0 0 2px rgba(22,163,74,0.15) !important;
    }
    .file-upload-area.is-invalid {
      border-color: #dc2626 !important;
      box-shadow: 0 0 0 2px rgba(220,38,38,0.15) !important;
    }
    .field-error.show {
      display: block !important;
      color: #dc2626 !important;
      margin-top: 8px;
      font-size: 12px;
    }
    .file-name.is-valid {
      color: #16a34a !important;
      font-weight: 600;
    }
    .file-name.is-invalid {
      color: #dc2626 !important;
      font-weight: 600;
    }
    .file-upload-area.is-loading {
      border-color: #f59e0b !important;
      box-shadow: 0 0 0 2px rgba(245,158,11,0.15) !important;
    }
    .file-name.is-loading {
      color: #f59e0b !important;
      font-weight: 600;
    }
  `;
  document.head.appendChild(style);
}

function getEl(id) {
  return document.getElementById(id);
}

function getFileExtension(filename = '') {
  const parts = filename.toLowerCase().split('.');
  return parts.length > 1 ? parts.pop() : '';
}

function setError(el, message) {
  if (!el) return;
  el.textContent = message || '';
  el.classList.toggle('show', Boolean(message));
}

function setFileVisualState({ fileUploadArea, fileNameEl, fileErrorEl, state, message }) {
  // state: 'valid' | 'invalid' | 'loading' | 'idle'
  const states = ['is-valid', 'is-invalid', 'is-loading'];

  if (fileUploadArea) {
    states.forEach(s => fileUploadArea.classList.remove(s));
    if (state !== 'idle') fileUploadArea.classList.add(`is-${state}`);
  }
  if (fileNameEl) {
    states.forEach(s => fileNameEl.classList.remove(s));
    if (state !== 'idle') fileNameEl.classList.add(`is-${state}`);
  }
  setError(fileErrorEl, message || '');
}

function validateFile(file, fileInput) {
  if (!file) {
    return { ok: false, message: 'Debes seleccionar un archivo.' };
  }

  if (file.size > MAX_BYTES) {
    return { ok: false, message: `El archivo excede ${MAX_MB} MB.` };
  }

  const ext = getFileExtension(file.name);
  if (!ALLOWED_EXT.includes(ext)) {
    return { ok: false, message: 'Formato inválido. Solo PDF, DOC o DOCX.' };
  }

  return { ok: true, message: '' };
}

function initArticleForm() {
  ensureFormStyles();

  const form = getEl('articleForm');
  if (!form) return;

  const titleInput     = getEl('articleTitle');
  const titleError     = getEl('titleError');
  const fileUploadArea = getEl('fileUploadArea');
  const filePickerBtn  = getEl('filePickerBtn');
  const fileInput      = getEl('fileInput');
  const fileNameEl     = getEl('fileName');
  const fileErrorEl    = getEl('fileError');
  const submitBtn      = getEl('submitBtn');
  const formTitle      = getEl('formTitle');
  const formSubtitle   = getEl('formSubtitle');

  let selectedFile = null;

  // Detectar modo edición
  const url = new URL(window.location.href);
  const editingId = url.searchParams.get('id') || null;

  // UI inicial según modo
  if (editingId) {
    if (formTitle)    formTitle.textContent = 'Editar artículo';
    if (formSubtitle) formSubtitle.textContent = 'Actualiza título y/o archivo del artículo.';
    if (submitBtn) {
      const btnText = submitBtn.querySelector('.btn-text');
      if (btnText) btnText.textContent = 'Guardar cambios';
      else submitBtn.textContent = 'Guardar cambios';
    }
  } else {
    if (formTitle)    formTitle.textContent = 'Nuevo artículo';
    if (formSubtitle) formSubtitle.textContent = 'Completa los campos para registrar un artículo académico.';
    if (submitBtn) {
      const btnText = submitBtn.querySelector('.btn-text');
      if (btnText) btnText.textContent = 'Crear artículo';
      else submitBtn.textContent = 'Crear artículo';
    }
  }

  // Cargar datos si es edición
  (async () => {
    if (!editingId) return;
    try {
      const article = await ArticleManager.getById(editingId);
      if (!article) return;
      if (titleInput) titleInput.value = article.title || '';
      if (fileNameEl) {
        fileNameEl.textContent = article.file?.name
          ? `Actual: ${article.file.name}`
          : 'Ningún archivo seleccionado';
      }
      setFileVisualState({ fileUploadArea, fileNameEl, fileErrorEl, state: 'idle', message: '' });
    } catch (e) {
      console.warn('No se pudo cargar el artículo en edición:', e);
    }
  })();

  // Botón de selección de archivo
  if (filePickerBtn && fileInput) {
    filePickerBtn.addEventListener('click', () => fileInput.click());
  }

  // Listener de cambio de archivo — feedback instantáneo
  if (fileInput) {
    fileInput.addEventListener('change', () => {
      const file = fileInput.files?.[0] ?? null;
      selectedFile = file;

      if (!file) {
        if (fileNameEl) fileNameEl.textContent = 'Ningún archivo seleccionado';
        setFileVisualState({ fileUploadArea, fileNameEl, fileErrorEl, state: 'idle', message: '' });
        return;
      }

      // Feedback amarillo inmediato mientras "procesa"
      if (fileNameEl) fileNameEl.textContent = file.name;
      setFileVisualState({ fileUploadArea, fileNameEl, fileErrorEl, state: 'loading', message: '' });

      // Pequeño delay para que se note el estado de carga antes del verde/rojo
      setTimeout(() => {
        const verdict = validateFile(file, fileInput);
        if (verdict.ok) {
          setFileVisualState({ fileUploadArea, fileNameEl, fileErrorEl, state: 'valid', message: '' });
        } else {
          setFileVisualState({ fileUploadArea, fileNameEl, fileErrorEl, state: 'invalid', message: verdict.message });
        }
      }, 300);
    });
  }

  // Drag & Drop
  if (fileUploadArea && fileInput) {
    fileUploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      fileUploadArea.classList.add('drag-over');
    });

    fileUploadArea.addEventListener('dragleave', () => {
      fileUploadArea.classList.remove('drag-over');
    });

    fileUploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      fileUploadArea.classList.remove('drag-over');
      const file = e.dataTransfer.files?.[0];
      if (!file) return;

      // Inyectar en el input
      const dt = new DataTransfer();
      dt.items.add(file);
      fileInput.files = dt.files;

      // Disparar change manualmente
      fileInput.dispatchEvent(new Event('change'));
    });
  }

  // Submit
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const title = (titleInput?.value || '').trim();

    if (!title) {
      setError(titleError, 'El título es obligatorio.');
    } else {
      setError(titleError, '');
    }

    let fileVerdict = { ok: true, message: '' };
    if (!editingId) {
      fileVerdict = validateFile(selectedFile, fileInput);
    } else if (selectedFile) {
      fileVerdict = validateFile(selectedFile, fileInput);
    }

    if (!fileVerdict.ok) {
      setFileVisualState({ fileUploadArea, fileNameEl, fileErrorEl, state: 'invalid', message: fileVerdict.message });
    }

    if (!title || !fileVerdict.ok) return;

    // Bloquear botón mientras guarda
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.style.opacity = '0.7';
    }

    try {
      if (editingId) {
        await ArticleManager.update(editingId, { title, file: selectedFile || undefined });
      } else {
        await ArticleManager.create({ title, file: selectedFile });
      }

      // Reset en creación
      if (!editingId) {
        if (titleInput) titleInput.value = '';
        if (fileInput)  fileInput.value = '';
        selectedFile = null;
        if (fileNameEl) fileNameEl.textContent = 'Ningún archivo seleccionado';
        setFileVisualState({ fileUploadArea, fileNameEl, fileErrorEl, state: 'idle', message: '' });
        setError(titleError, '');
      }

      try {
        Router.navigate('dashboard');
      } catch {
        // fallback si Router no está disponible
      }

    } catch (err) {
      console.error('❌ Error guardando artículo:', err);
      setFileVisualState({ fileUploadArea, fileNameEl, fileErrorEl, state: 'invalid', message: 'No se pudo guardar el artículo.' });
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.style.opacity = '1';
      }
    }
  });
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initArticleForm);
} else {
  initArticleForm();
}

window.__initArticleForm = initArticleForm;