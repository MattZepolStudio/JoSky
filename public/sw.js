const CACHE_NAME = 'josky-v7';
const ASSETS_TO_CACHE = [
  '/manifest.json',
  '/icon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(() => {
        // Continue even if some dev assets aren't pre-fetched immediately
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

function cacheResponse(request, response) {
  if (response && response.status === 200) {
    const responseToCache = response.clone();
    caches.open(CACHE_NAME).then((cache) => cache.put(request, responseToCache));
  }
  return response;
}

self.addEventListener('fetch', (event) => {
  // Only handle our own GET requests and skip socket.io or backend API polling
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/socket.io') || url.pathname.startsWith('/api') || url.pathname === '/healthz') {
    return;
  }

  // The page always comes from the network when possible, so a deploy reaches players right away
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => cacheResponse('/', response))
        .catch(() => caches.match('/'))
    );
    return;
  }

  // Everything else is either hashed or an icon: the cache is safe
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request).then((response) => cacheResponse(event.request, response));
    })
  );
});
