const CACHE = 'aoa-v1';

const PRECACHE = [
  'index.html',
  'login.html',
  'journey.html',
  'journal.html',
  'community.html',
  'support.html',
  'divine-script.html',
  'manifest.json',
  'supabase-client.js',
  'profile-menu.js',
  'install-banner.js',
  'search.js',
];

// Install: pre-cache shell
self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return cache.addAll(PRECACHE);
    })
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE; })
            .map(function (k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

// Fetch: network-first for HTML, cache-first for static assets
self.addEventListener('fetch', function (e) {
  var req = e.request;

  // Skip non-GET and cross-origin (Supabase, Google, etc.)
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.destination === 'document') {
    // Network-first for HTML pages (keeps content fresh)
    e.respondWith(
      fetch(req).then(function (res) {
        var clone = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, clone); });
        return res;
      }).catch(function () {
        return caches.match(req).then(function (cached) {
          return cached || caches.match('index.html');
        });
      })
    );
  } else {
    // Cache-first for JS, CSS, images
    e.respondWith(
      caches.match(req).then(function (cached) {
        if (cached) return cached;
        return fetch(req).then(function (res) {
          var clone = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, clone); });
          return res;
        });
      })
    );
  }
});
