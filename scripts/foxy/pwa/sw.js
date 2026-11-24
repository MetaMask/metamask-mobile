// Foxy service worker. Its only job is to let the installed app open and show its last shell when the Foxy server is not running.
// Live data (the API) is never cached: a stale request list would be worse than an empty one.
const CACHE = 'foxy-shell-v1';
const SHELL = [
  '/',
  '/manifest.webmanifest',
  '/pwa/icon-192.png',
  '/pwa/icon-512.png',
  '/pwa/apple-touch-icon.png',
  '/vendor/rive.js',
  '/vendor/rive.wasm',
  '/vendor/foxy-loading.riv',
  '/font/grotzec-cond-bold.otf',
];
const LIVE = ['/api/'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => Promise.all(SHELL.map((url) => cache.add(url).catch(() => {}))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (LIVE.some((prefix) => url.pathname.startsWith(prefix))) return;

  if (request.mode === 'navigate') {
    // network first, so an edited dashboard shows on reload; the cached copy only answers when the server is unreachable
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) caches.open(CACHE).then((cache) => cache.put('/', response.clone()));
          return response;
        })
        .catch(() => caches.match('/')),
    );
    return;
  }

  // the shell's own files do not change between builds, so cache first
  event.respondWith(
    caches.match(request).then((hit) => hit || fetch(request).then((response) => {
      if (response.ok) caches.open(CACHE).then((cache) => cache.put(request, response.clone()));
      return response;
    })),
  );
});
