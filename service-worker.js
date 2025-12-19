
const CACHE_NAME = 'klaro-cache-v2'; // Increment version to invalidate old cache logic
const urlsToCache = [
  '/',
  '/index.html',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap',
  'https://unpkg.com/recharts/umd/Recharts.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.23/jspdf.plugin.autotable.min.js'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. Ignore API calls (Gemini, etc.)
  if (url.host.includes('googleapis.com')) {
    return;
  }

  // 2. Network First strategy for HTML, JS, TSX (App Shell & Logic)
  // This ensures the user gets the latest version of the code.
  if (event.request.mode === 'navigate' || url.pathname.endsWith('.tsx') || url.pathname.endsWith('.js') || url.pathname === '/') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Update cache with new version
          if (response && response.status === 200 && response.type === 'basic') {
             const responseToCache = response.clone();
             caches.open(CACHE_NAME).then((cache) => {
               cache.put(event.request, responseToCache);
             });
          }
          return response;
        })
        .catch(() => {
          // Fallback to cache if offline
          return caches.match(event.request);
        })
    );
    return;
  }

  // 3. Cache First strategy for static assets (Libs, Fonts, Images)
  // These rarely change and should be served fast.
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }

        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then(
          (response) => {
            if (!response || response.status !== 200 || event.request.method !== 'GET') {
              return response;
            }

            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        );
      })
  );
});

self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// --- Background Sync Implementation ---

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-transactions') {
    console.log('[Service Worker] Sync event triggered');
    event.waitUntil(handleSync());
  }
});

async function handleSync() {
  // 1. Notify clients that sync has started
  await notifyClients({ type: 'SYNC_STARTED' });

  try {
    // 2. Simulate heavy lifting / data synchronization
    console.log('[Service Worker] Synchronizing data...');
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 2500));

    // Simulate a random error for demonstration purposes (10% chance)
    if (Math.random() < 0.1) {
        throw new Error("Netzwerk-Timeout bei Block-Verifizierung");
    }

    // 3. Notify clients that sync is complete
    console.log('[Service Worker] Sync complete');
    await notifyClients({ type: 'SYNC_COMPLETE', timestamp: new Date().toISOString() });
    
  } catch (error) {
    console.error('[Service Worker] Sync failed:', error);
    await notifyClients({ type: 'SYNC_ERROR', message: error.message || 'Unbekannter Fehler' });
    throw error;
  }
}

async function notifyClients(message) {
  const allClients = await self.clients.matchAll({ includeUncontrolled: true });
  for (const client of allClients) {
    client.postMessage(message);
  }
}
