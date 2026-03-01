/**
 * sw.js
 * Service Worker para PeerReview PWA
 * Proporciona funcionalidad offline y caché de recursos
 */

const CACHE_NAME = 'peerreview-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/home.html',
  '/dashboard.html',
  '/styles.css',
  '/app.js',
  '/pages/dashboard.js',
  '/pages/article-form.js',
  '/components/ArticleManager.js',
  '/components/ArticleList.js',
  '/components/Router.js',
  '/components/AuthManager.js',
  '/components/SyncEngine.js',
  '/components/Toast.js',
  '/db/ArticleDB.js',
  '/db/SyncDB.js'
];

// Instalación: cachear recursos estáticos
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando Service Worker...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Cacheando recursos estáticos...');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Recursos cacheados correctamente');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Error cacheando recursos:', error);
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

// Fetch: estrategia Cache First con Network Fallback
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // No interceptar peticiones a la API ni a otros dominios
  if (url.origin !== self.location.origin) {
    return;
  }

  // Estrategia para recursos estáticos (JS, CSS, HTML)
  if (request.destination === 'script' || 
      request.destination === 'style' || 
      request.destination === 'document') {
    
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          // Si está en cache, devolverlo
          if (cachedResponse) {
            // Actualizar cache en segundo plano
            fetch(request)
              .then((networkResponse) => {
                if (networkResponse.ok) {
                  caches.open(CACHE_NAME)
                    .then((cache) => cache.put(request, networkResponse));
                }
              })
              .catch(() => {
                // Error de red, ignorar
              });
            
            return cachedResponse;
          }

          // Si no está en cache, ir a la red
          return fetch(request)
            .then((networkResponse) => {
              if (networkResponse.ok) {
                const clonedResponse = networkResponse.clone();
                caches.open(CACHE_NAME)
                  .then((cache) => cache.put(request, clonedResponse));
              }
              return networkResponse;
            })
            .catch((error) => {
              console.error('[SW] Error de red:', error);
              // Si es un documento HTML y falla, mostrar página offline
              if (request.destination === 'document') {
                return caches.match('/index.html');
              }
              throw error;
            });
        })
    );
  }

  // Para imágenes y otros recursos: Network First con Cache Fallback
  if (request.destination === 'image') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse.ok) {
            const clonedResponse = networkResponse.clone();
            caches.open(CACHE_NAME)
              .then((cache) => cache.put(request, clonedResponse));
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
      // Notificar a la aplicación que sincronice
      self.clients.matchAll()
        .then((clients) => {
          clients.forEach((client) => {
            client.postMessage({ type: 'SYNC_REQUIRED' });
          });
        })
    );
  }
});

// Notificaciones push (opcional, para futuras funcionalidades)
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
