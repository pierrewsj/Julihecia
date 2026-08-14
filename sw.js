const CACHE = 'julih-cia-v2';
const ASSETS = [
  './','./index.html','./styles.css','./app.js','./manifest.json',
  './assets/logo-banner.png','./assets/brandmark.png','./assets/icon-192.png','./assets/icon-512.png'
];
self.addEventListener('install', event => { self.skipWaiting(); event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS))); });
self.addEventListener('activate', event => event.waitUntil(Promise.all([caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))), self.clients.claim()])));
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(fetch(event.request).then(resp => {
    const copy = resp.clone();
    caches.open(CACHE).then(cache => cache.put(event.request, copy)).catch(()=>{});
    return resp;
  }).catch(() => caches.match(event.request).then(cached => cached || caches.match('./index.html'))));
});
