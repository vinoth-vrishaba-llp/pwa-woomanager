// client/public/service-worker.js
/* global self, clients */

const SHELL_CACHE = 'woomanager-shell-v2';
const API_CACHE = 'woomanager-api-v1';

self.addEventListener('install', (event) => {
  console.log('[SW] install');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] activate');
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => ![SHELL_CACHE, API_CACHE].includes(k))
          .map((k) => caches.delete(k))
      )
    )
  );
  clients.claim();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Only touch GET requests
  if (request.method !== 'GET') return;

  // API: network-first, cache fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const clone = res.clone();
          caches.open(API_CACHE).then((cache) => cache.put(request, clone));
          return res;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Navigations: let network win, fallback to cached index if offline
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Static assets: cache-first
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request))
  );
});
