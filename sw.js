const CACHE = "tony-v10";
const ASSETS = ["./", "index.html", "manifest.json", "icon-192.png", "icon.svg"];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.all(ASSETS.map(a => c.add(a).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;

  let url;
  try { url = new URL(req.url); } catch (err) { return; }

  // Data ze serveru (Supabase apod.) nikdy neobsluhujeme ani neukládáme do cache —
  // jinak by při výpadku sítě appka dostala stará data a myslela si, že je má aktuální.
  if (url.origin !== self.location.origin) return;
  if (url.pathname.indexOf("/rest/") >= 0 || url.pathname.indexOf("/realtime/") >= 0) return;

  e.respondWith(
    fetch(req)
      .then(res => {
        if (res && res.ok && res.type === "basic") {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(req).then(m => m || caches.match("index.html")))
  );
});
