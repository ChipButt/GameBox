/* Bingo In physical-host offline cache. Only controls /GameBox/bingo/ pages. */
const CACHE='bingo-in-event-host-v4';
const FILES=['./','./index.html','./display.html','./bingo.css','./bingo.js','./event-model.js','./event-host.css','./event-host.js'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(Promise.all([
 caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('bingo-in-event-host-')&&k!==CACHE).map(k=>caches.delete(k)))),
 self.clients.claim()
]))});
self.addEventListener('fetch',e=>{
 const req=e.request,u=new URL(req.url);
 if(req.method!=='GET'||u.origin!==self.location.origin||!u.pathname.startsWith(new URL(self.registration.scope).pathname))return;
 e.respondWith(caches.match(req,{ignoreSearch:true}).then(cached=>cached||fetch(req).then(res=>{
   if(res.ok){const copy=res.clone();caches.open(CACHE).then(c=>c.put(req,copy)).catch(()=>{})}
   return res;
 })));
});
