const VERSION = 'ntuh-phone-v3';
const PRECACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-192.png',
  './icons/maskable-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-32.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(async c => {
    await c.addAll(PRECACHE.filter(p => p !== './' && !p.endsWith('index.html')));
    
    for (const p of ['./', './index.html']) {
      try {
        const r = await fetch(new Request(p, { cache: 'reload' }));
        if (r && r.ok) await c.put(p, r.clone());
      } catch {}
    }
  }).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys
      .filter(k => k.startsWith('ntuh-phone-') && k !== VERSION)
      .map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});


self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  const isDoc = req.mode === 'navigate' ||
    (req.destination === 'document') ||
    url.pathname.endsWith('/index.html');

  if (isDoc) {
    e.respondWith((async () => {
      const cache = await caches.open(VERSION);
      try {
        const net = await Promise.race([
          
          fetch(new Request(req.url, { cache: 'no-cache' })),
          new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 3000)),
        ]);
        if (net && net.ok) cache.put(req, net.clone());
        return net;
      } catch {
        return (await cache.match(req)) || (await cache.match('./index.html')) || Response.error();
      }
    })());
    return;
  }

  e.respondWith((async () => {
    const cache = await caches.open(VERSION);
    const hit = await cache.match(req);
    if (hit) return hit;
    try {
      const net = await fetch(req);
      if (net && net.ok) cache.put(req, net.clone());
      return net;
    } catch {
      return Response.error();
    }
  })());
});
