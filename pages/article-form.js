/**
 * pages/article-form.js
 * Controlador de la página de creación / edición de artículos.
 *
 * Modo edición: ?id=<articleId>  en la URL
 * Modo creación: sin parámetros
 */

import { ArticleManager } from '../components/ArticleManager.js';

/* ── Elementos del DOM ── */
const form         = document.getElementById('articleForm');
const titleInput   = document.getElementById('articleTitle');
const fileInput    = document.getElementById('fileInput');
const filePickerBtn = document.getElementById('filePickerBtn');
const fileUploadArea = document.getElementById('fileUploadArea');
const fileNameEl   = document.getElementById('fileName');
const submitBtn    = document.getElementById('submitBtn');
const formTitleEl  = document.getElementById('formTitle');
const formSubtitleEl = document.getElementById('formSubtitle');
const titleError   = document.getElementById('titleError');
const fileError    = document.getElementById('fileError');
const toast        = document.getElementById('toast');
const headerEl     = document.querySelector('.form-card__header');

/* ── Estado del módulo ── */
let editId      = null;  // id si estamos en edición
let selectedFile = null; // File seleccionado por el usuario
let existingFile = null; // metadata del archivo ya guardado (modo edición)

/* ── Utilidades ── */

function showToast(message, type = 'success') {
  toast.textContent = message;
  toast.className   = `toast show ${type}`;
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.className = 'toast';
  }, 3500);
}

function setFileDisplay(name, hasFile = false) {
  fileNameEl.textContent = name;
  fileNameEl.className   = hasFile ? 'file-name has-file' : 'file-name';
  fileUploadArea.classList.toggle('has-file', hasFile);
}

function clearErrors() {
  titleError.textContent = '';
  fileError.textContent  = '';
  titleInput.classList.remove('is-invalid');
}

function validate() {
  let valid = true;

  if (!titleInput.value.trim()) {
    titleError.textContent = 'El título es obligatorio.';
    titleInput.classList.add('is-invalid');
    valid = false;
  }

  // En creación siempre requerimos archivo; en edición sólo si no hay uno guardado
  if (!selectedFile && !existingFile) {
    fileError.textContent = 'Debes seleccionar un archivo (PDF o DOCX).';
    valid = false;
  }

  return valid;
}

/* ── Inicialización ── */

async function init() {
  const params = new URLSearchParams(window.location.search);
  editId = params.get('id') || null;

  if (editId) {
    await loadEditMode(editId);
  } else {
    setCreateMode();
  }

  bindEvents();
}

function setCreateMode() {
  formTitleEl.textContent    = 'Nuevo artículo';
  formSubtitleEl.textContent = 'Completa los campos para registrar un artículo académico.';
  submitBtn.querySelector('.btn-text').textContent = 'Crear artículo';
}

async function loadEditMode(id) {
  const article = await ArticleManager.getById(id);

  if (!article) {
    showToast('Artículo no encontrado. Redirigiendo…', 'error');
    setTimeout(() => {
      window.history.replaceState({}, '', window.location.pathname);
      location.reload();
    }, 2500);
    return;
  }

  // Actualizar UI para modo edición
  formTitleEl.innerHTML = `
    <span class="edit-badge">&#9998; Modo edición</span><br>
    Editar artículo
  `;
  formSubtitleEl.textContent = `Modifica los campos y guarda los cambios.`;
  submitBtn.querySelector('.btn-text').textContent = 'Guardar cambios';

  // Prellenar campos
  titleInput.value = article.title;

  if (article.file) {
    existingFile = article.file;
    setFileDisplay(`${article.file.name} (guardado)`, true);
    filePickerBtn.textContent = 'Cambiar archivo';
  }
}

/* ── Eventos ── */

function bindEvents() {
  // Abrir selector de archivos
  filePickerBtn.addEventListener('click', () => fileInput.click());

  // Archivo seleccionado desde el input
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    handleFileSelected(file);
  });

  // Drag & Drop
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
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelected(file);
  });

  // Limpiar error de título al escribir
  titleInput.addEventListener('input', () => {
    titleError.textContent = '';
    titleInput.classList.remove('is-invalid');
  });

  // Submit del formulario
  form.addEventListener('submit', handleSubmit);
}

function handleFileSelected(file) {
  const allowed = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];

  if (!allowed.includes(file.type)) {
    fileError.textContent = 'Formato no permitido. Usa PDF o DOCX.';
    return;
  }

  const maxMB = 20;
  if (file.size > maxMB * 1024 * 1024) {
    fileError.textContent = `El archivo supera el límite de ${maxMB} MB.`;
    return;
  }

  fileError.textContent = '';
  selectedFile = file;
  setFileDisplay(file.name, true);
}

async function handleSubmit(e) {
  e.preventDefault();
  clearErrors();

  if (!validate()) return;

  submitBtn.disabled = true;
  submitBtn.querySelector('.btn-text').textContent = 'Guardando…';

  try {
    if (editId) {
      await ArticleManager.update(editId, {
        title: titleInput.value,
        file:  selectedFile, // puede ser null si no cambió
      });
      showToast('✓ Artículo actualizado correctamente.', 'success');
    } else {
      const article = await ArticleManager.create({
        title: titleInput.value,
        file:  selectedFile,
      });
      showToast('✓ Artículo creado correctamente.', 'success');

      // Reset del formulario para otra subida
      form.reset();
      selectedFile = null;
      setFileDisplay('Ningún archivo seleccionado', false);
      filePickerBtn.textContent = 'Seleccionar archivo';

      // Actualizar URL al modo edición del artículo recién creado
      // (sin recargar la página)
      const newUrl = `${window.location.pathname}?id=${article.id}`;
      window.history.pushState({ id: article.id }, '', newUrl);
      editId = article.id;
      existingFile = article.file;
      titleInput.value = article.title;
      setFileDisplay(`${article.file.name} (guardado)`, true);
      await loadEditMode(article.id);
    }
  } catch (err) {
    console.error(err);
    showToast('Error al guardar el artículo. Inténtalo de nuevo.', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.querySelector('.btn-text').textContent =
      editId ? 'Guardar cambios' : 'Crear artículo';
  }
}

/* ── Arranque ── */
init();