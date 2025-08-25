const CACHE_NAME = 'celero-selfservice-v2';
const urlsToCache = [
  '/',
  '/index',
  '/landing',
  '/invoice-list',
  '/invoice-details',
  '/payment-confirmation',
  '/manifest.json',
  '/favicon.ico'
];

// Instalar SW
self.addEventListener('install', (event) => {
  console.log('Service Worker: Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Cache abierto');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error('Service Worker: Error al cachear:', error);
      })
  );
});

// Fetch - estrategia Network First con fallback a cache
self.addEventListener('fetch', (event) => {
  // Filtrar solicitudes que puedan causar problemas de CORS o que no deben cachearse
  const url = new URL(event.request.url);
  
  // Evitar interceptar solicitudes externas que puedan causar problemas de CORS
  if (url.origin !== location.origin && 
      (url.hostname.includes('google.com') || 
       url.hostname.includes('googleapis.com') ||
       url.hostname.includes('paypal.com') ||
       url.hostname.includes('yappy.cloud'))) {
    return; // Permitir que la solicitud pase sin interceptar
  }

  // No cachear requests POST, PUT, DELETE, etc.
  if (event.request.method !== 'GET') {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Verificar que la respuesta sea válida y del mismo origen
        if (response && response.status === 200 && response.type === 'basic') {
          try {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              })
              .catch((error) => {
                console.warn('Service Worker: Error al cachear:', error);
              });
          } catch (error) {
            console.warn('Service Worker: Error al clonar respuesta:', error);
          }
        }
        return response;
      })
      .catch((error) => {
        console.warn('Service Worker: Error en fetch:', error);
        // Si falla la red, buscar en cache
        return caches.match(event.request)
          .then((response) => {
            if (response) {
              return response;
            }
            // Si no está en cache, devolver página offline para rutas de navegación
            if (event.request.mode === 'navigate') {
              return caches.match('/');
            }
            // Para otros tipos de solicitudes, generar una respuesta vacía
            return new Response('', { status: 200, statusText: 'OK' });
          })
          .catch((cacheError) => {
            console.warn('Service Worker: Error en cache:', cacheError);
            return new Response('', { status: 200, statusText: 'OK' });
          });
      })
  );
});

// Activar SW y limpiar caches viejos
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activando...');
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Service Worker: Eliminando cache viejo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Mensaje desde la app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
