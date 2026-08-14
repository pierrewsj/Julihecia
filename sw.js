const CACHE='julih-cliente-v7-0';
const ASSETS=["./", "./index.html", "./index.html?v=7.0", "./styles-v7.css", "./styles-v7.css?v=7.0", "./app-v7.js", "./app-v7.js?v=7.0", "./config.js", "./config.js?v=7.0", "./manifest.json", "./manifest.json?v=7.0", "./assets/icon-192.png", "./assets/icon-512.png", "./assets/julih-art-v7.png"];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)))});
self.addEventListener('activate',e=>e.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))),self.clients.claim()])));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy)).catch(()=>{});return r}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html?v=7.0')||caches.match('./index.html'))))});
