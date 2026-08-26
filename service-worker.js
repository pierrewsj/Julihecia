const CACHE_VERSION = 'julih-cliente-v14';
const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./pwa.js",
  "./art.js",
  "./app.js",
  "./config.js",
  "./manifest.json",
  "./icon-96.png",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png"
];

self.addEventListener('install', event => { event.waitUntil(caches.open(CACHE_VERSION).then(cache => cache.addAll(APP_SHELL))); });
self.addEventListener('activate', event => { event.waitUntil((async()=>{ const keys=await caches.keys(); await Promise.all(keys.filter(key=>key!==CACHE_VERSION).map(key=>caches.delete(key))); await self.clients.claim(); })()); });
self.addEventListener('message', event => { if (event.data?.tipo === 'SKIP_WAITING') self.skipWaiting(); });
self.addEventListener('fetch', event => {
 const request=event.request; if(request.method!=='GET') return; const url=new URL(request.url); if(url.origin!==self.location.origin) return;
 const critical=request.mode==='navigate'||/\/(index\.html|app\.js|styles\.css|pwa\.js|art\.js|config\.js|manifest\.json)$/.test(url.pathname);
 if(critical){ event.respondWith((async()=>{ try{ const response=await fetch(request,{cache:'no-store'}); if(response.ok){const cache=await caches.open(CACHE_VERSION); await cache.put(request.mode==='navigate'?'./index.html':request,response.clone());} return response; }catch(_){ return (await caches.match(request))||(await caches.match('./index.html'))||Response.error(); } })()); return; }
 event.respondWith((async()=>{ const cached=await caches.match(request); if(cached)return cached; try{const response=await fetch(request); if(response.ok){const cache=await caches.open(CACHE_VERSION); await cache.put(request,response.clone());} return response;}catch(_){return Response.error();} })());
});
