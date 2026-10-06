/**
 * Service worker — Dicetidice Boardgame Draft.
 * BUILD viene stampato dalla GitHub Action: cambia a ogni push, quindi cambia anche
 * questo file => il browser installa un nuovo SW e una nuova cache.
 *
 * Strategia: network-first per build.json, index/navigazioni; cache-first per gli asset.
 * In dev (build non stampata) è network-first per tutto, così le modifiche si vedono subito.
 * IMPORTANTE: ogni file di js/, data/, css/ deve stare in PRECACHE (lo verifica `npm test`).
 */
const BUILD = '__BUILD__';
const DEV = BUILD.startsWith('__');
const CACHE = `dtd-bgd-${DEV ? 'dev' : BUILD}`;

const PRECACHE = [
  './',
  'index.html',
  'manifest.json',
  'css/style.css',
  'js/app.js',
  'js/audio.js',
  'js/build.js',
  'js/draft-engine.js',
  'js/export.js',
  'js/pitch.js',
  'js/rng.js',
  'js/state.js',
  'js/storage.js',
  'js/ui.js',
  'js/version.js',
  'js/views.js',
  'data/categories.js',
  'data/facts.js',
  'data/words.js',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'icons/apple-touch-icon.png',
  'icons/favicon-32.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      // cache:'reload' salta la cache HTTP: scarichiamo sempre file freschi.
      .then((c) => c.addAll(PRECACHE.map((u) => new Request(u, { cache: 'reload' }))))
      .then(() => (DEV ? self.skipWaiting() : undefined))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('dtd-bgd-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Il banner "Aggiorna" manda questo messaggio per attivare subito il nuovo SW.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    const res = await fetch(new Request(request, { cache: 'no-store' }));
    if (res && res.ok) cache.put(request, res.clone());
    return res;
  } catch (err) {
    const hit = (await cache.match(request, { ignoreSearch: true })) ||
      (request.mode === 'navigate' ? await cache.match(new URL('index.html', self.registration.scope).href) : null);
    if (hit) return hit;
    throw err;
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res && res.ok) cache.put(request, res.clone());
  return res;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  const p = url.pathname;
  const isShell = request.mode === 'navigate' || p.endsWith('/') || p.endsWith('/index.html') || p.endsWith('/build.json');
  event.respondWith(DEV || isShell ? networkFirst(request) : cacheFirst(request));
});
