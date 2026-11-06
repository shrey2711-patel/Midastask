// Midas Task Management Service Worker with App Badging Support
const CACHE_NAME = 'midastask-cache-v1';
const ASSETS = [
  '/',
  '/login.html',
  '/dashboard.html',
  '/css/style.css',
  '/data/mock-data.js',
  '/js/auth.js',
  '/js/tasks.js',
  '/js/dashboard.js',
  '/js/app.js',
  '/manifest.webmanifest'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});

// Background badge message receiver
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SET_BADGE') {
    const count = event.data.count || 0;
    if (navigator.setAppBadge) {
      if (count > 0) {
        navigator.setAppBadge(count).catch(() => {});
      } else {
        navigator.clearAppBadge().catch(() => {});
      }
    }
  }
});
