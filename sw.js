// オフライン用 Service Worker。初回に全ファイルをキャッシュする。
// ファイルを追加したら FILES に足し、CACHE の版を上げること（古いキャッシュは自動で削除される）。
const CACHE = 'shelter-manager-v2';
const FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './src/styles.css',
  './src/main.js',
  './src/ui/dom.js',
  './src/ui/screens.js',
  './src/engine/game.js',
  './src/engine/layout.js',
  './src/engine/needs.js',
  './src/engine/events.js',
  './src/engine/missions.js',
  './src/engine/scoring.js',
  './src/engine/save.js',
  './src/engine/survey.js',
  './src/data/config.js',
  './src/data/facilities.js',
  './src/data/scenarios/index.js',
  './src/data/scenarios/earthquake.js',
  './src/data/tutorial.js',
  './src/data/survey.js',
  './src/data/sources.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return; // 外部へのリクエストは扱わない
  // 通信できるときは最新版を取りに行き（試用中の修正をすぐ反映するため）、
  // 通信できないときはキャッシュで動かす。
  e.respondWith(
    fetch(e.request).then((res) => {
      if (res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
      }
      return res;
    }).catch(() => caches.match(e.request, { ignoreSearch: true })
      .then((hit) => hit || caches.match('./index.html'))),
  );
});
