// Keeps the phone page working with no signal. Serves the cached copy first,
// then refreshes the cache in the background so code updates arrive next launch.
// Only the page's own files are cached — the vault lives in localStorage, encrypted.
const CACHE = "passenter-v2";
const FILES = ["./index.html", "./manifest.webmanifest", "./icon-180.png", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      // Opening the app at ".../" is the same page as index.html.
      const cached = (await cache.match(e.request, { ignoreSearch: true })) ||
        (e.request.mode === "navigate" ? await cache.match("./index.html") : undefined);
      const fresh = fetch(e.request)
        .then((res) => {
          if (res.ok) cache.put(e.request, res.clone());
          return res;
        })
        .catch(() => cached);
      return cached || fresh;
    })
  );
});
