/**
 * components/PDFViewer.js
 * Visor de PDF en modal elegante usando Blob URL + iframe nativo del navegador.
 * Compatible con Chrome, Firefox, Edge y Safari (iOS 16+).
 */

export const PDFViewer = {
    _modal: null,
    _currentBlobUrl: null,

    /**
     * Abre el visor de PDF con la URL de blob proporcionada.
     * @param {string} blobUrl  - URL creada con URL.createObjectURL()
     * @param {string} fileName - Nombre del archivo para mostrar en la barra del visor
     */
    open(blobUrl, fileName = 'documento.pdf') {
        this._currentBlobUrl = blobUrl;
        this._ensureModal();
        this._updateContent(blobUrl, fileName);
        this._modal.classList.add('pdf-modal--visible');
        document.body.style.overflow = 'hidden';
    },

    /**
     * Cierra el modal y libera la Blob URL.
     */
    close() {
        if (this._modal) {
            this._modal.classList.remove('pdf-modal--visible');
        }
        document.body.style.overflow = '';
        // Liberar memoria después de la animación
        setTimeout(() => {
            if (this._currentBlobUrl) {
                URL.revokeObjectURL(this._currentBlobUrl);
                this._currentBlobUrl = null;
            }
            const iframe = document.getElementById('pdfViewerFrame');
            if (iframe) iframe.src = 'about:blank';
        }, 300);
    },

    /**
     * Crea el modal en el DOM si no existe todavía.
     */
    _ensureModal() {
        if (document.getElementById('pdfViewerModal')) {
            this._modal = document.getElementById('pdfViewerModal');
            return;
        }

        this._modal = document.createElement('div');
        this._modal.id = 'pdfViewerModal';
        this._modal.className = 'pdf-modal';
        this._modal.innerHTML = `
      <div class="pdf-modal__backdrop" id="pdfModalBackdrop"></div>
      <div class="pdf-modal__panel">
        <div class="pdf-modal__header">
          <div class="pdf-modal__title-wrap">
            <span class="pdf-modal__icon">📄</span>
            <span class="pdf-modal__title" id="pdfViewerTitle">Documento</span>
          </div>
          <div class="pdf-modal__actions">
            <a
              id="pdfDownloadBtn"
              class="pdf-modal__btn pdf-modal__btn--download"
              download
              title="Descargar PDF"
            >⬇ Descargar</a>
            <button
              class="pdf-modal__btn pdf-modal__btn--close"
              id="pdfViewerCloseBtn"
              title="Cerrar visor"
            >✕</button>
          </div>
        </div>
        <div class="pdf-modal__body">
          <iframe
            id="pdfViewerFrame"
            class="pdf-modal__iframe"
            src="about:blank"
            title="Visor de PDF"
          ></iframe>
          <div class="pdf-modal__fallback" id="pdfFallback" style="display:none;">
            <div class="pdf-modal__fallback-content">
              <span style="font-size:3rem;">📄</span>
              <h3>Tu navegador no puede mostrar el PDF</h3>
              <p>Descárgalo para verlo con tu lector preferido.</p>
              <a id="pdfFallbackDownload" class="btn btn--primary" download>
                ⬇ Descargar PDF
              </a>
            </div>
          </div>
        </div>
      </div>
    `;

        document.body.appendChild(this._modal);

        // Event listeners
        document.getElementById('pdfViewerCloseBtn').addEventListener('click', () => this.close());
        document.getElementById('pdfModalBackdrop').addEventListener('click', () => this.close());

        // Cerrar con Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this._modal?.classList.contains('pdf-modal--visible')) {
                this.close();
            }
        });
    },

    /**
     * Actualiza el contenido del iframe y el título.
     */
    _updateContent(blobUrl, fileName) {
        const titleEl = document.getElementById('pdfViewerTitle');
        const iframe = document.getElementById('pdfViewerFrame');
        const downloadBtn = document.getElementById('pdfDownloadBtn');
        const fallback = document.getElementById('pdfFallback');
        const fallbackDl = document.getElementById('pdfFallbackDownload');

        if (titleEl) titleEl.textContent = fileName;
        if (downloadBtn) { downloadBtn.href = blobUrl; downloadBtn.download = fileName; }
        if (fallbackDl) { fallbackDl.href = blobUrl; fallbackDl.download = fileName; }

        if (iframe) {
            iframe.style.display = 'block';
            if (fallback) fallback.style.display = 'none';

            iframe.src = blobUrl;

            // Si el iframe no puede cargar (ej. Safari iOS), mostrar fallback
            iframe.onerror = () => {
                iframe.style.display = 'none';
                if (fallback) fallback.style.display = 'flex';
            };
        }
    },
};

// Exponer globalmente para uso desde onclick en templates HTML
window.PDFViewer = PDFViewer;
