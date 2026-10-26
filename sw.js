// Offline: every file the app needs is cached on install. Requests are answered from the cache at once and refreshed
// from the network in the background, so the app opens instantly and offline, and picks up a new version on the next
// launch. Bump VERSION with each release.
const VERSION='cook99-2026-10-26d';
const FILES=['./','./index.html','./styles.css?v=15','./app.js?v=21','./model.js','./charts.js','./dishes.js','./manifest.webmanifest','./icon.svg','./icon-180.png','./icon-512.png',
  './assets/Geist.ttf','./assets/InstrumentSerif-Regular.ttf'];
self.addEventListener('install',e=>e.waitUntil(caches.open(VERSION).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('cook99-')&&k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  const req=e.request;if(req.method!=='GET'||new URL(req.url).origin!==location.origin)return;
  e.respondWith(caches.open(VERSION).then(async cache=>{
    const hit=await cache.match(req,{ignoreSearch:req.mode==='navigate'});
    const fresh=fetch(req).then(res=>{if(res.ok)cache.put(req,res.clone());return res;}).catch(()=>null);
    if(hit){e.waitUntil(fresh);return hit;}
    return (await fresh)||(req.mode==='navigate'?cache.match('./index.html'):Response.error());
  }));
});
