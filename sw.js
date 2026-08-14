const CACHE = 'julih-cia-v1';
const ASSETS = [
  './','./index.html','./styles.css','./app.js','./manifest.json',
  './assets/logo-banner.webp','./assets/brandmark.webp','./assets/icon-192.png','./assets/icon-512.png'
];
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS))));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))));
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(fetch(event.request).then(resp => {
    const copy = resp.clone();
    caches.open(CACHE).then(cache => cache.put(event.request, copy)).catch(()=>{});
    return resp;
  }).catch(() => caches.match(event.request).then(cached => cached || caches.match('./index.html'))));
});
