/* 热点追踪 · Service Worker
 *
 * 版本机制：缓存名由注册 URL 上的 ?v= 决定（index.html 里的 BUILD 常量）。
 * 所以每次迭代只改 index.html 一处，sw.js 的缓存版本自动同步，不会漏 bump。
 *
 * 缓存策略：
 *   页面导航 / data.js → network-first（在线永远拿最新，断网回退缓存）
 *   图标、manifest 等 → stale-while-revalidate（先给缓存，后台悄悄更新）
 * 这样「更新今日热点」只要替换 data.js，用户在线打开就是新一期，无需手动清缓存。
 */

const BUILD = new URL(self.location.href).searchParams.get('v') || 'dev';
const PREFIX = 'hottrack-';
const CACHE = PREFIX + BUILD;
const INDEX_URL = new URL('./index.html', self.registration.scope).href;

const CORE = [
  './',
  './index.html',
  './data.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
  './favicon.ico'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE)
      .then(function (cache) { return cache.addAll(CORE); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.filter(function (k) {
          return k.indexOf(PREFIX) === 0 && k !== CACHE;
        }).map(function (k) { return caches.delete(k); }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

/* 页面导航：在线走网络并把结果存成 index.html，离线用缓存的页面壳 */
async function navigationFirst(request) {
  const cache = await caches.open(CACHE);
  const key = new Request(INDEX_URL);
  try {
    const res = await fetch(request, { cache: 'no-store' });
    if (res && res.ok) await cache.put(key, res.clone());
    return res;
  } catch (err) {
    const hit = await cache.match(key) || await cache.match(INDEX_URL);
    if (hit) return hit;
    return new Response('离线且暂无缓存，请联网后重新打开一次。', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }
}

/* 每日数据：在线优先取最新，离线回退上一次缓存 */
async function dataFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    const res = await fetch(request, { cache: 'no-store' });
    if (res && res.ok) await cache.put(request, res.clone());
    return res;
  } catch (err) {
    const hit = await cache.match(request);
    if (hit) return hit;
    throw err;
  }
}

/* 静态资源：缓存优先，同时后台刷新 */
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(request);
  let fresh = null;
  try {
    const res = await fetch(request);
    if (res && res.ok) {
      await cache.put(request, res.clone());
      fresh = res;
    }
  } catch (err) { /* 离线时忽略 */ }
  return fresh || hit || new Response('', { status: 504 });
}

self.addEventListener('fetch', function (event) {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // 站外链接不拦

  if (req.mode === 'navigate') {
    event.respondWith(navigationFirst(req));
  } else if (url.pathname.indexOf('data.js') !== -1) {
    event.respondWith(dataFirst(req));
  } else {
    event.respondWith(staleWhileRevalidate(req));
  }
});

self.addEventListener('message', function (event) {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then(function (keys) {
        return Promise.all(keys.filter(function (k) {
          return k.indexOf(PREFIX) === 0;
        }).map(function (k) { return caches.delete(k); }));
      })
    );
  }
});
