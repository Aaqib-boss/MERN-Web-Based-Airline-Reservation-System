const CACHE_NAME = 'skywave-cache-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/icons.svg'
];

// Install Event - Pre-cache critical static shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pre-caching offline shell');
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event - Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Clearing old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - Intercept requests for offline caching
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // 1. Handle API Requests (Network First)
  if (requestUrl.pathname.startsWith('/api/')) {
    // Only cache GET requests
    if (event.request.method !== 'GET') {
      return; // POST/PUT/DELETE bypass cache
    }

    // Targets: Flights searches, PNR lookups, user travel history dashboards
    const isCacheableApi = 
      requestUrl.pathname.startsWith('/api/flights') ||
      requestUrl.pathname.startsWith('/api/bookings/pnr/') ||
      requestUrl.pathname.startsWith('/api/bookings/user') ||
      requestUrl.pathname.startsWith('/api/users/profile');

    if (isCacheableApi) {
      event.respondWith(
        fetch(event.request)
          .then((response) => {
            // Clone the response before saving it to cache
            if (response.status === 200) {
              const responseClone = response.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseClone);
              });
            }
            return response;
          })
          .catch(() => {
            // Network failed - attempt cache retrieval
            console.log('[Service Worker] Network offline. Rerouting to cache for:', event.request.url);
            return caches.match(event.request).then((cachedResponse) => {
              if (cachedResponse) {
                return cachedResponse;
              }
              // If not found in cache and it is a JSON API, return a clean offline message JSON
              return new Response(
                JSON.stringify({
                  success: false,
                  offline: true,
                  message: 'Connection lost. Operating in offline mode. Some information might be outdated.'
                }),
                {
                  status: 503,
                  headers: { 'Content-Type': 'application/json' }
                }
              );
            });
          })
      );
      return;
    }
  }

  // 2. Handle Static Assets & Pages (Stale-While-Revalidate)
  // Cache HTML, CSS, JS, images, fonts
  const isStaticAsset = 
    requestUrl.origin === self.location.origin &&
    (event.request.destination === 'document' ||
     event.request.destination === 'script' ||
     event.request.destination === 'style' ||
     event.request.destination === 'image' ||
     event.request.destination === 'font' ||
     requestUrl.pathname.endsWith('.js') ||
     requestUrl.pathname.endsWith('.css') ||
     requestUrl.pathname.endsWith('.png') ||
     requestUrl.pathname.endsWith('.svg') ||
     requestUrl.pathname.endsWith('.jpg'));

  if (isStaticAsset) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse.status === 200) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseClone);
              });
            }
            return networkResponse;
          })
          .catch(() => {
            // Fallback for document navigation when offline
            if (event.request.mode === 'navigate') {
              return caches.match('/index.html') || caches.match('/');
            }
          });

        return cachedResponse || fetchPromise;
      })
    );
  }
});
