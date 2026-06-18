const CACHE_NAME = 'three-accounts-v2';
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

// Google Sheets API calls: always network, never cached.
// App shell (index.html, manifest, icons): network-FIRST, falling back to
// the cached copy only when there's no connection. This means whenever you
// update the files on GitHub, the next time you open the app with any
// signal at all, it fetches the fresh version and re-caches it — no manual
// cache-busting needed. Offline still works because the last successful
// fetch is what's sitting in the cache.
self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  if (url.includes('script.google.com')) {
    event.respondWith(fetch(event.request).catch(() => new Response(
      JSON.stringify({ok:false, offline:true}),
      {headers:{'Content-Type':'application/json'}}
    )));
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Got a fresh copy — update the cache for next time we're offline.
        const responseClone = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        return networkResponse;
      })
      .catch(() => {
        // No connection — fall back to whatever we last cached.
        return caches.match(event.request);
      })
  );
});
