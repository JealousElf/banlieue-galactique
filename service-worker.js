const CACHE_NAME = 'banlieue-gal-cache-v1';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  // ajoute ici tes fichiers CSS, JS et autres ressources importantes
];

// Installation du service worker : on cache les ressources
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
    .then(cache => cache.addAll(urlsToCache))
  );
});

// Activation : nettoyage ancien cache si besoin
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
    .then(keyList => Promise.all(
      keyList.map(key => {
        if (key !== CACHE_NAME) {
          return caches.delete(key);
        }
      })
    ))
  );
});

// Interception des requêtes pour retourner le cache si dispo
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
    .then(response => response || fetch(event.request))
  );
});
