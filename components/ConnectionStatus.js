/**
 * components/ConnectionStatus.js
 */

export const ConnectionStatus = {
  isOnline: navigator.onLine,

  init() {
    this.render();
    this.setupListeners();
  },

  render() {
    const header = document.querySelector('.header-inner');
    if (!header) return;

    const indicator = document.createElement('div');
    indicator.id = 'connection-indicator';
    indicator.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
      margin-left: 20px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    `;

    indicator.innerHTML = `
      <span id="connection-dot" style="
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background-color: #4caf50;
        transition: background-color 0.3s ease;
      "></span>
      <span id="connection-text" style="
        color: #4caf50;
        transition: color 0.3s ease;
      ">Online</span>
    `;

    const logo = header.querySelector('.logo');
    if (logo) {
      logo.insertAdjacentElement('afterend', indicator);
    } else {
      header.insertBefore(indicator, header.firstChild);
    }
  },

  updateUI(isOnline) {
    const dot = document.getElementById('connection-dot');
    const text = document.getElementById('connection-text');
    if (!dot || !text) return;

    if (isOnline) {
      dot.style.backgroundColor = '#4caf50';
      text.style.color = '#4caf50';
      text.textContent = 'Online';
    } else {
      dot.style.backgroundColor = '#f44336';
      text.style.color = '#f44336';
      text.textContent = 'Offline';
    }
  },

  async checkRealConnection() {
    // ✅ En localhost confiar en navigator.onLine (fetch siempre funciona en local)
    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
      return navigator.onLine;
    }

    // ✅ En producción hacer ping real al servidor
    try {
      const response = await fetch('/ping', {
        method: 'HEAD',
        cache: 'no-cache',
        signal: AbortSignal.timeout(3000)
      });
      return response.ok;
    } catch {
      return false;
    }
  },

  setupListeners() {
    window.addEventListener('online', async () => {
      console.log('[Connection] Evento online — verificando...');
      const real = await this.checkRealConnection();
      this.isOnline = real;
      this.updateUI(real);
    });

    window.addEventListener('offline', () => {
      console.log('[Connection] Evento offline');
      this.isOnline = false;
      this.updateUI(false);
    });

    setInterval(async () => {
      const real = await this.checkRealConnection();

      if (real !== this.isOnline) {
        console.log(`[Connection] Cambio detectado por polling: ${real ? 'Online' : 'Offline'}`);
        this.isOnline = real;
        this.updateUI(real);
      }
    }, 10_000);

    // Estado inicial
    this.checkRealConnection().then(real => {
      this.isOnline = real;
      this.updateUI(real);
    });
  }
};