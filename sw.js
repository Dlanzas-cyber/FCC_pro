const CACHE = "fcc-pro-v2";

// Only cache same-origin assets at install time
// External CDN assets are cached on first fetch
const LOCAL_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
];

const CDN_ASSETS = [
  "https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js",
  "https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js",
];

// Install — cache local assets only (CDN cached on demand)
self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(cache =>
      Promise.allSettled(LOCAL_ASSETS.map(url => cache.add(url).catch(() => {})))
    )
  );
  self.skipWaiting();
});

// Activate — remove old caches
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — cache first for everything
self.addEventListener("fetch", e => {
  // Only handle GET requests
  if (e.request.method !== "GET") return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;

      return fetch(e.request).then(response => {
        // Cache valid responses (avoid opaque cross-origin unless CDN)
        if (response && response.status === 200) {
          const url = e.request.url;
          const isCDN = CDN_ASSETS.some(a => url.includes(a.split("//")[1].split("/")[0]));
          const isSameOrigin = url.startsWith(self.location.origin);
          if (isSameOrigin || isCDN) {
            const clone = response.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
          }
        }
        return response;
      }).catch(() => cached || new Response("Offline", { status: 503 }));
    })
  );
});
