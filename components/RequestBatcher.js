/**
 * components/RequestBatcher.js
 * Agrupa y optimiza peticiones para reducir carga del servidor
 */

export const RequestBatcher = {
  _queue: [],
  _processing: false,
  _batchInterval: null,
  _batchDelay: 1000, // 1 segundo para agrupar peticiones

  /**
   * Inicializa el batcher
   */
  init() {
    console.log('📦 RequestBatcher inicializado');

    // Evitar doble init
    if (this._batchInterval) {
      clearInterval(this._batchInterval);
      this._batchInterval = null;
    }

    // Procesar cola periódicamente
    this._batchInterval = setInterval(() => {
      this._processBatch();
    }, this._batchDelay);
  },

  /**
   * Agrega una petición a la cola
   */
  addRequest(request) {
    return new Promise((resolve, reject) => {
      this._queue.push({
        ...request,
        resolve,
        reject,
        timestamp: Date.now()
      });

      // Si hay muchas peticiones en cola, procesar inmediatamente
      if (this._queue.length >= 5) {
        this._processBatch();
      }
    });
  },

  /**
   * Procesa el lote de peticiones
   */
  async _processBatch() {
    if (this._processing || this._queue.length === 0) return;

    this._processing = true;
    const batch = this._queue.splice(0); // Tomar todas las peticiones

    try {
      console.log(`📦 Procesando lote de ${batch.length} peticiones`);

      // Agrupar peticiones por tipo y URL
      const grouped = this._groupRequests(batch);

      // Procesar cada grupo
      for (const [key, requests] of Object.entries(grouped)) {
        await this._processGroup(key, requests);
      }
    } catch (error) {
      console.error('❌ Error procesando lote:', error);

      // Rechazar todas las peticiones del lote
      batch.forEach(request => request.reject(error));
    } finally {
      this._processing = false;
    }
  },

  /**
   * Agrupa peticiones similares
   */
  _groupRequests(requests) {
    const groups = {};

    requests.forEach(request => {
      const key = `${request.method}:${request.url}`;

      if (!groups[key]) groups[key] = [];
      groups[key].push(request);
    });

    return groups;
  },

  /**
   * Procesa un grupo de peticiones
   */
  async _processGroup(key, requests) {
    const firstColon = key.indexOf(':');
    const method = key.slice(0, firstColon);
    const url = key.slice(firstColon + 1);

    // Para GET requests a /articles o /comments, consolidar
    if (method === 'GET' && (url.includes('/articles') || url.includes('/comments'))) {
      await this._processBatchedGET(requests, url);
    } else {
      // Para otras peticiones, procesar individualmente pero en paralelo
      await Promise.all(requests.map(request => this._executeRequest(request)));
    }
  },

  /**
   * Procesa peticiones GET agrupadas
   */
  async _processBatchedGET(requests, url) {
    try {
      console.log(`📥 Consolidando ${requests.length} peticiones GET a ${url}`);

      // Unificar headers (por si SyncEngine manda If-Modified-Since)
      const mergedHeaders = {};
      for (const r of requests) {
        if (r.headers && typeof r.headers === 'object') {
          Object.assign(mergedHeaders, r.headers);
        }
      }
      // Asegurar no-cache por defecto
      mergedHeaders['Cache-Control'] = mergedHeaders['Cache-Control'] || 'no-cache';

      const response = await fetch(url, {
        method: 'GET',
        headers: mergedHeaders
      });

      // NOTA: 304 NO CONTENT con cache headers puede pasar
      if (response.status === 304) {
        requests.forEach(request => {
          request.resolve({
            data: null,
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
            ok: response.ok
          });
        });
        return;
      }

      let data = null;
      try {
        data = await response.json();
      } catch {
        try {
          data = await response.text();
        } catch {
          data = null;
        }
      }

      // Resolver todas las peticiones con el MISMO response shape
      requests.forEach(request => {
        request.resolve({
          data,
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
          ok: response.ok
        });
      });
    } catch (error) {
      requests.forEach(request => request.reject(error));
    }
  },

  /**
   * Ejecuta una petición individual
   */
  async _executeRequest(request) {
    try {
      const response = await fetch(request.url, {
        method: request.method,
        headers: request.headers || {},
        body: request.body
      });

      // Intentar parsear como JSON, pero manejar respuestas que no son JSON
      let data = null;
      try {
        data = await response.json();
      } catch {
        try {
          data = await response.text();
        } catch {
          data = null;
        }
      }

      request.resolve({
        data,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        ok: response.ok
      });
    } catch (error) {
      request.reject(error);
    }
  },

  /**
   * Detiene el batcher
   */
  stop() {
    if (this._batchInterval) {
      clearInterval(this._batchInterval);
      this._batchInterval = null;
    }
    console.log('🛑 RequestBatcher detenido');
  }
};