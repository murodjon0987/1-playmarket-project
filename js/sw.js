/**
 * sw.js
 * -----------------------------------------------------------------------
 * Kiyimim AI uchun oddiy service worker: ilova qobig'ini (HTML/CSS/JS)
 * keshga oladi, shu bilan ilova internetsiz ham ochilishi mumkin.
 * Ma'lumotlar (kiyimlar, hisob va h.k.) baribir localStorage'da saqlanadi,
 * bu fayl faqat statik fayllarni offline yuklash uchun javobgar.
 * -----------------------------------------------------------------------
 */
const CACHE_NAME = 'kiyimim-ai-v1';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon512.svg',
  './css/style.css',
  './js/storage.js',
  './js/data.js',
  './js/ui.js',
  './js/auth.js',
  './js/wardrobe.js',
  './js/ai.js',
  './js/app.js',
  './js/features.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

// Cache-first strategiya: avval keshdan, topilmasa tarmoqdan, u ham bo'lmasa index.html (offline fallback)
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request)
        .then(response => {
          if (response && response.ok && response.type === 'basic') {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match('./index.html'));
    })
  );
});