/**
 * components/SyncButton.js
 * Botón flotante de sincronización manual
 */

import { SyncEngine } from './SyncEngine.js';

export const SyncButton = {
  _btn: null,
  _label: null,

  init() {
    this._render();
    // Refrescar lista cuando sincronización termine
    window.addEventListener('articlesSynced', (e) => {
      const { downloaded, uploaded } = e.detail;
      this._showFeedback(`✅ ${downloaded} bajados, ${uploaded} subidos`, 'success');
      // Avisar a ArticleList que recargue
      window.dispatchEvent(new CustomEvent('articlesChanged'));
    });
  },

  _render() {
    // Estilos
    const style = document.createElement('style');
    style.textContent = `
      #sync-fab {
        position: fixed;
        bottom: 28px;
        right: 28px;
        z-index: 1000;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 8px;
        font-family: inherit;
      }

      #sync-fab-label {
        background: rgba(0,0,0,0.75);
        color: #fff;
        font-size: 12px;
        padding: 4px 10px;
        border-radius: 20px;
        white-space: nowrap;
        opacity: 0;
        transform: translateY(4px);
        transition: opacity 0.3s, transform 0.3s;
        pointer-events: none;
      }

      #sync-fab-label.visible {
        opacity: 1;
        transform: translateY(0);
      }

      #sync-fab-btn {
        width: 52px;
        height: 52px;
        border-radius: 50%;
        border: none;
        background: #1976d2;
        color: #fff;
        font-size: 22px;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0,0,0,0.25);
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.2s, transform 0.2s;
        outline: none;
      }

      #sync-fab-btn:hover {
        background: #1565c0;
        transform: scale(1.08);
      }

      #sync-fab-btn:active {
        transform: scale(0.95);
      }

      #sync-fab-btn:disabled {
        background: #90a4ae;
        cursor: not-allowed;
        transform: none;
      }

      #sync-fab-btn.syncing .sync-icon {
        animation: spin 1s linear infinite;
      }

      @keyframes spin {
        from { transform: rotate(0deg); }
        to   { transform: rotate(360deg); }
      }

      #sync-fab-label.success {
        background: rgba(22, 163, 74, 0.9);
      }

      #sync-fab-label.error {
        background: rgba(220, 38, 38, 0.9);
      }
    `;
    document.head.appendChild(style);

    // Contenedor
    const fab = document.createElement('div');
    fab.id = 'sync-fab';

    // Label de feedback
    const label = document.createElement('div');
    label.id = 'sync-fab-label';
    label.textContent = '';
    this._label = label;

    // Botón
    const btn = document.createElement('button');
    btn.id = 'sync-fab-btn';
    btn.title = 'Sincronizar con el servidor';
    btn.innerHTML = '<span class="sync-icon">🔄</span>';
    btn.addEventListener('click', () => this._handleClick());
    this._btn = btn;

    fab.appendChild(label);
    fab.appendChild(btn);
    document.body.appendChild(fab);
  },

  async _handleClick() {
    if (this._btn.disabled) return;

    this._setLoading(true);
    this._showFeedback('Sincronizando...', 'info');

    const result = await SyncEngine.sync();

    this._setLoading(false);

    if (result.success) {
      this._showFeedback(result.message, 'success');
    } else {
      this._showFeedback(result.message, 'error');
    }
  },

  _setLoading(loading) {
    if (!this._btn) return;
    this._btn.disabled = loading;
    this._btn.classList.toggle('syncing', loading);
  },

  _showFeedback(message, type = 'info') {
    if (!this._label) return;
    this._label.textContent = message;
    this._label.className = `visible ${type}`;

    // Ocultar después de 3 segundos
    clearTimeout(this._hideTimeout);
    this._hideTimeout = setTimeout(() => {
      this._label.className = '';
    }, 3000);
  }
};