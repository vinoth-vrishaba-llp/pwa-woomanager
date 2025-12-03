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
// 🔔 Web Push handler
self.addEventListener('push', (event) => {
  if (!event.data) {
    return;
  }

  let data = {};
  try {
    data = event.data.json();
  } catch (e) {
    data = { title: 'New notification', body: event.data.text() };
  }

  const title = data.title || 'New notification';
  const body = data.body || '';

  const orderId = data.orderId;
  const storeId = data.storeId;
  const cartId = data.cartId;
  const type = data.type || 'order'; // 'order' | 'abandoned_cart' | etc

  const options = {
    body,
    icon: '/Woo_logo_color-192.png',
    badge: '/Woo_logo_color-192.png',
    data: {
      orderId,
      storeId,
      cartId,
      type,
      url: '/', // SPA root
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  const urlToOpen = data.url || '/';

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        const targetClient = clientList.length ? clientList[0] : null;

        // Focus existing client if any
        if (targetClient && 'focus' in targetClient) {
          targetClient.focus();

          // Tell the app what to do
          if (data.type === 'abandoned_cart') {
            targetClient.postMessage({
              action: 'open-abandoned-cart',
              cartId: data.cartId,
              storeId: data.storeId,
            });
          } else if (data.orderId) {
            targetClient.postMessage({
              action: 'open-order',
              orderId: data.orderId,
              storeId: data.storeId,
            });
          }

          return;
        }

        // No existing client -> open new window
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});