/**
 * sw.js
 * -----------------------------------------------------------------------
 * Oddiy service worker: ilova qobig'ini (app shell) keshlab, offline
 * rejimda ham asosiy interfeys ochilishini ta'minlaydi. Ma'lumotlarning
 * o'zi baribir foydalanuvchi qurilmasidagi localStorage'da saqlanadi.
 * -----------------------------------------------------------------------
 */
const CACHE_NAME = "kiyimim-ai-v2";
const APP_SHELL = [
  "./",
  "./index.html",
  "./css/style.css",
  "./js/storage.js",
  "./js/data.js",
  "./js/ui.js",
  "./js/auth.js",
  "./js/wardrobe.js",
  "./js/ai.js",
  "./js/features.js",
  "./js/profile-edit.js",
  "./js/testimonials.js",
  "./js/app.js",
  "./manifest.json",
  "./js/run.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch(() => {}),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)),
        ),
      ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches
              .open(CACHE_NAME)
              .then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});
