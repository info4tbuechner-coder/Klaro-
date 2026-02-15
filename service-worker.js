
const CACHE_NAME = 'klaro-cache-v8';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap',
  'https://img.icons8.com/fluency/192/bot.png',
  'https://img.icons8.com/fluency/512/bot.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('SW: Pre-caching assets');
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Gemini API ignorieren (Immer Netzwerk, kein Caching)
  if (url.host.includes('googleapis.com') && url.pathname.includes('v1beta')) {
    return;
  }

  // Cache First für Fonts, Icons und statische CDNs mit Netzwerk-Fallback
  if (
    url.host.includes('fonts.gstatic.com') || 
    url.host.includes('cdn.tailwindcss.com') || 
    url.host.includes('icons8.com') ||
    url.host.includes('fonts.googleapis.com') ||
    url.host.includes('aistudiocdn.com')
  ) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        
        return fetch(event.request).then((fetchResponse) => {
          if (!fetchResponse || fetchResponse.status !== 200) return fetchResponse;
          
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, fetchResponse.clone());
            return fetchResponse;
          });
        }).catch(() => {
          // Fallback für Offline-Ressourcen
          return new Response('Offline resource not available', { status: 503 });
        });
      })
    );
    return;
  }

  // Stale While Revalidate für App-Logic & HTML
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, networkResponse.clone());
          });
        }
        return networkResponse;
      }).catch(() => {
        return cachedResponse;
      });
      
      return cachedResponse || fetchPromise;
    }).catch(() => caches.match('/'))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('SW: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
