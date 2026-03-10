/**
 * sw.js
 * Service Worker para PeerReview PWA
 * Proporciona funcionalidad offline y caché de recursos
 */

const CACHE_NAME = 'peerreview-v2';
const STATIC_ASSETS = [
  '/index.html',
  '/home.html',
  '/dashboard.html',
  '/login.html',
  '/styles/minimal.css',
  '/components/ArticleManager.js',
  '/components/ArticleList.js',
  '/components/Router.js',
  '/components/AuthManager.js',
  '/components/SyncEngine.js',
  '/db/ArticleDB.js',
  '/db/SyncDB.js'
];

// Instalación: cachear recursos estáticos
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando Service Worker...');

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Cacheando recursos estáticos individualmente...');
        return Promise.allSettled(
          STATIC_ASSETS.map(url =>
            fetch(url).then(response => {
              if (!response.ok) throw new Error(`Status ${response.status} for ${url}`);
              return cache.put(url, response);
            }).catch(err => console.error(`[SW] Failed to cache ${url}:`, err))
          )
        );
      })
      .then(() => {
        console.log('[SW] Instalación completada (algunos recursos pueden haber fallado)');
        return self.skipWaiting();
      })
  );
});

// Activación: limpiar caches antiguas
self.addEventListener('activate', (event) => {
  console.log('[SW] Activando Service Worker...');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('[SW] Eliminando cache antigua:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Service Worker activado');
        return self.clients.claim();
      })
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // No interceptar peticiones a la API ni a otros dominios
  if (url.origin !== self.location.origin) {
    return;
  }

  // ─── HTML: Network First (siempre intenta red, cache como fallback) ───
  if (request.destination === 'document') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.ok && (url.protocol === 'http:' || url.protocol === 'https:')) {
            try {
              const clonedResponse = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clonedResponse)).catch(e => console.warn('Cache put failed', e));
            } catch (e) {
              console.warn('Could not clone response:', e);
            }
          }
          return networkResponse;
        })
        .catch(() => {
          console.warn('[SW] Red no disponible, usando cache para:', request.url);
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) return cachedResponse;
            return caches.match('/index.html').then((indexResponse) => {
              return indexResponse || new Response('App Offline. Please connect to the internet to load.', {
                status: 503,
                statusText: 'Service Unavailable',
                headers: new Headers({ 'Content-Type': 'text/plain' })
              });
            });
          });
        })
    );
    return;
  }

  // ─── JS y CSS: Cache First con actualización en segundo plano ───
  if (request.destination === 'script' || request.destination === 'style') {
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            // Actualizar cache en segundo plano
            fetch(request)
              .then((networkResponse) => {
                if (networkResponse && networkResponse.ok && (url.protocol === 'http:' || url.protocol === 'https:')) {
                  caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse.clone())).catch(e => console.warn('Cache update failed', e));
                }
              })
              .catch(() => { });
            return cachedResponse;
          }

          // No está en cache, ir a la red
          return fetch(request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.ok && (url.protocol === 'http:' || url.protocol === 'https:')) {
                try {
                  const clonedResponse = networkResponse.clone();
                  caches.open(CACHE_NAME).then((cache) => cache.put(request, clonedResponse)).catch(e => console.warn('Cache put failed', e));
                } catch (e) {
                  console.warn('Could not clone response:', e);
                }
              }
              return networkResponse;
            })
            .catch((error) => {
              console.error('[SW] Error de red para script/style:', error);
              throw error;
            });
        })
    );
    return;
  }

  // ─── Imágenes: Network First con Cache Fallback ───
  if (request.destination === 'image') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.ok && (url.protocol === 'http:' || url.protocol === 'https:')) {
            try {
              const clonedResponse = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clonedResponse)).catch(e => console.warn('Cache put image failed', e));
            } catch (e) {
              console.warn('Could not clone image response:', e);
            }
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(request);
        })
    );
  }
});

// Sincronización en segundo plano (Background Sync)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-articles') {
    console.log('[SW] Sincronizando artículos en segundo plano...');
    event.waitUntil(
      self.clients.matchAll()
        .then((clients) => {
          clients.forEach((client) => {
            client.postMessage({ type: 'SYNC_REQUIRED' });
          });
        })
    );
  }
});

// Notificaciones push
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body || 'Nueva notificación',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      vibrate: [100, 50, 100],
      data: {
        url: data.url || '/'
      }
    };

    event.waitUntil(
      self.registration.showNotification(
        data.title || 'PeerReview',
        options
      )
    );
  }
});

// Click en notificación
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    self.clients.openWindow(event.notification.data.url)
  );
});