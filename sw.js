const CACHE_NAME = 'three-accounts-v1';
const SHELL_FILES = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Network-first for the Apps Script API (so data is always fresh when online),
// cache-first for the app shell itself (so the app opens instantly offline).
self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  if (url.includes('script.google.com')) {
    // Always go to network for Sheet data; don't cache API calls.
    event.respondWith(fetch(event.request).catch(() => new Response(
      JSON.stringify({ok:false, offline:true}),
      {headers:{'Content-Type':'application/json'}}
    )));
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request);
    })
  );
});
