import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// ✅ Service worker registration with custom "update available" event
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then((reg) => {
        console.log('[SW] registered', reg.scope);

        // Detect when a NEW service worker has been found (updated build)
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            // "installed" happens for:
            // - first ever install (no controller)
            // - updates (there IS a controller)
            const isInstalled = newWorker.state === 'installed';
            const hasExistingController = !!navigator.serviceWorker.controller;

            // We only care about UPDATES, not first install
            if (isInstalled && hasExistingController) {
              console.log('[SW] new version installed, dispatching update event');
              window.dispatchEvent(new Event('woomanager-update-available'));
            }
          });
        });
      })
      .catch((err) => {
        console.error('[SW] registration failed', err);
      });
  });
}
