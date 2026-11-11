// Midas Task Management Service Worker with Network-First & API Bypass
const CACHE_NAME = 'midastask-cache-v2';
const ASSETS = [
  '/',
  '/login.html',
  '/dashboard.html',
  '/client.html',
  '/widget.html',
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
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // Never cache live API sync or widget binary downloads
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/widget/') || e.request.method !== 'GET') {
    return;
  }

  // Network-first so latest cloud updates load cleanly
  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(e.request))
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
