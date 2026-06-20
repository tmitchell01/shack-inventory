const CACHE_NAME = 'shack-inventory-v3';
const APP_SHELL = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/jsQR/1.4.0/jsQR.js',
  'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.all(
        APP_SHELL.map((url) =>
          cache.add(new Request(url, { cache: 'reload' })).catch(() => {})
        )
      );
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    ).then(() => self.clients.claim())
  );
});

// Page navigations and index.html: NETWORK-FIRST. This is the file most likely
// to change as the app gets updated, so we always try the network first and
// only fall back to the cached copy if there's no connection at all. Without
// this, updates could get stuck behind a stale cached index.html indefinitely.
//
// Everything else (icons, manifest, CDN libraries): CACHE-FIRST, since these
// rarely change and this is what makes the app load instantly offline.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const isHtmlOrNav = event.request.mode === 'navigate' ||
                       event.request.url.endsWith('.html') ||
                       event.request.url.endsWith('/');

  if (isHtmlOrNav) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' }).then((response) => {
        if (response && response.status === 200) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      }).catch(() => caches.match(event.request).then((c) => c || caches.match('./index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response && response.status === 200) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      }).catch(() => {});
    })
  );
});
