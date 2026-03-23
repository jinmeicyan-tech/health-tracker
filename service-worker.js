const CACHE_NAME = 'health-tracker-v1';
const STATIC_ASSETS = [
  '/health-tracker/',
  '/health-tracker/index.html',
  '/health-tracker/manifest.json',
  '/health-tracker/icons/icon-192.png',
  '/health-tracker/icons/icon-512.png',
  '/health-tracker/icons/apple-touch-icon.png'
];

// GASのURLパターン（キャッシュしない）
const GAS_URL_PATTERN = /script\.google\.com/;

// インストール：静的アセットをキャッシュ
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// アクティベート：古いキャッシュを削除
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// フェッチ：Cache First（GASはNetwork Only）
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // GASへの送信はキャッシュしない（ネットワーク優先）
  if (GAS_URL_PATTERN.test(url.hostname)) {
    event.respondWith(fetch(event.request).catch(() => {
      return new Response(JSON.stringify({ error: 'offline' }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }));
    return;
  }

  // Google Fontsもネットワーク優先（失敗時はキャッシュ）
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // その他：Cache First
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
    }).catch(() => {
      // オフライン時にHTMLリクエストならindex.htmlを返す
      if (event.request.destination === 'document') {
        return caches.match('/health-tracker/index.html');
      }
    })
  );
});
