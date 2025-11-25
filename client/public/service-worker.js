// client/public/service-worker.js

const CACHE_NAME = 'woomanager-shell-v1';
const API_CACHE = 'woomanager-api-v1';

const APP_SHELL = [
  '/',
  '/index.html',
  // For production builds, Vite will generate hashed assets;
  // you'd normally cache those instead of /src/* files.
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => ![CACHE_NAME, API_CACHE].includes(k))
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // ❗ Do NOT try to cache non-GET requests (POST, PUT, DELETE, etc.)
  if (request.method !== 'GET') {
    // For API POSTs, just go to network; no cache.
    if (url.pathname.startsWith('/api/')) {
      event.respondWith(
        fetch(request).catch(() =>
          new Response(
            JSON.stringify({ error: 'Offline', message: 'Request failed while offline.' }),
            {
              status: 503,
              headers: { 'Content-Type': 'application/json' },
            }
          )
        )
      );
      return;
    }
    // For other non-GETs, let the browser handle it.
    return;
  }

  // ---- API GET requests: network-first, cache fallback ----
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const clone = res.clone();
          caches.open(API_CACHE).then((cache) => cache.put(request, clone));
          return res;
        })
        .catch(() =>
          caches.match(request).then((cached) => cached || Promise.reject('no-match'))
        )
    );
    return;
  }

  // ---- App shell navigations: cache-first ----
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match('/index.html').then((cached) => cached || fetch(request))
    );
    return;
  }

  // ---- Static assets: cache-first fallback ----
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request))
  );
});
