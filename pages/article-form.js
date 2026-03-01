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

// Detectar si estamos en modo edición
const currentScript = document.currentScript;
if (currentScript && currentScript.getAttribute('data-article-id')) {
  editId = currentScript.getAttribute('data-article-id');
  console.log('✏️ Modo edición, ID desde data-article-id:', editId);
} else {
  // También intentar obtener desde el hash de la URL
  const hashMatch = window.location.hash.match(/#edit\/(.+)/);
  if (hashMatch) {
    editId = hashMatch[1];
    console.log('✏️ Modo edición, ID desde hash:', editId);
  }
}

let existingFile = null; // metadata del archivo ya guardado (modo edición)

/* ── Utilidades ── */

function showToast(message, type = 'success') {
  // Notificación simple sin SyncUI
  console.log(`[${type}] ${message}`);
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
  // Usar el ID que pasamos via data-article-id
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
  console.log('🔍 Cargando artículo para editar, ID:', id);
  
  try {
    const article = await ArticleManager.getById(id);
    console.log('📄 Artículo encontrado:', article);

    if (!article) {
      showToast('Artículo no encontrado. Redirigiendo…', 'error');
      setTimeout(() => {
        window.Router.navigate('dashboard');
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

    // Prellenar campos con datos reales
    titleInput.value = article.title || '';
    console.log('📝 Título cargado:', article.title);

    if (article.file) {
      existingFile = article.file;
      const fileName = article.file.name || 'archivo.pdf';
      setFileDisplay(`${fileName} (guardado)`, true);
      
      // Buscar el botón de selector de archivo si existe
      const fileBtn = document.getElementById('filePickerBtn') || 
                      document.querySelector('[onclick*="fileInput.click()"]');
      if (fileBtn) {
        fileBtn.textContent = 'Cambiar archivo';
      }
      
      console.log('📎 Archivo cargado:', fileName);
    }

    showToast('✅ Artículo cargado para edición', 'success');
    
  } catch (error) {
    console.error('❌ Error cargando artículo:', error);
    showToast('Error al cargar el artículo', 'error');
  }
}

/* ── Eventos ── */

function bindEvents() {
  // Verificar si los elementos existen antes de agregar event listeners
  if (!form || !titleInput || !submitBtn) {
    console.warn('⚠️ Algunos elementos del formulario no existen, usando fallback');
    bindFallbackEvents();
    return;
  }
  
  // Abrir selector de archivos
  if (filePickerBtn) {
    filePickerBtn.addEventListener('click', () => fileInput.click());
  }

  // Archivo seleccionado desde el input
  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      handleFileSelected(file);
    });
  }

  // Drag & Drop
  if (fileUploadArea) {
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
  }

  // Limpiar error de título al escribir
  titleInput.addEventListener('input', () => {
    if (titleError) {
      titleError.textContent = '';
      titleInput.classList.remove('is-invalid');
    }
  });

  // Submit del formulario
  form.addEventListener('submit', handleSubmit);
}

function bindFallbackEvents() {
  // Event listeners simples para el formulario básico
  const form = document.getElementById('articleForm');
  const titleInput = document.getElementById('articleTitle');
  const submitBtn = document.getElementById('submitBtn');
  
  if (form && titleInput && submitBtn) {
    console.log('🔧 Usando event listeners fallback');
    
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      if (!titleInput.value.trim()) {
        alert('El título es obligatorio');
        return;
      }
      
      submitBtn.disabled = true;
      submitBtn.querySelector('.btn-text').textContent = 'Guardando…';
      
      try {
        if (editId) {
          await ArticleManager.update(editId, {
            title: titleInput.value,
            file: selectedFile
          });
          showToast('✓ Artículo actualizado correctamente.', 'success');
        } else {
          const article = await ArticleManager.create({
            title: titleInput.value,
            file: selectedFile
          });
          showToast('✓ Artículo creado correctamente.', 'success');
        }
        
        // Redirigir al dashboard después de guardar
        setTimeout(() => {
          window.Router.navigate('dashboard');
        }, 1500);
        
      } catch (error) {
        console.error('Error guardando artículo:', error);
        showToast('Error al guardar el artículo', 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.querySelector('.btn-text').textContent = editId ? 'Guardar cambios' : 'Crear artículo';
      }
    });
  }
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

// Exponer globalmente para inicialización manual
window.initArticleForm = init;

// Auto-inicializar si no está en modo dashboard
if (!window.location.pathname.includes('dashboard.html')) {
  init();
}