// Offline Service Worker for Usman Cloth Rehra POS
const CACHE_NAME = 'usman-cloth-rehra-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Pass through fetch with cache fallback if offline
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request).catch(async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(event.request);
      if (cached) return cached;
      if (event.request.mode === 'navigate') {
        const index = await cache.match('/');
        if (index) return index;
      }
      return new Response('Offline - Usman Cloth Rehra POS is running offline from local cache.', {
        headers: { 'Content-Type': 'text/plain' },
      });
    })
  );
});
