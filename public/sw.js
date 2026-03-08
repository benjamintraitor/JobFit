const CACHE_NAME = "jobfit-v1";

// 需要预缓存的核心资源
const PRECACHE_URLS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icon-192.svg",
  "/icon-512.svg",
];

// 安装：预缓存核心资源
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// 激活：清理旧版本缓存
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// 请求拦截策略：
// - API 请求（/api/*）：永远走网络，不缓存（保证数据实时）
// - 静态资源：Cache First（优先缓存，提升速度）
// - 页面导航：Network First（优先网络，保证最新内容）
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // API 请求直接走网络
  if (url.pathname.startsWith("/api/")) {
    return;
  }

  // 静态资源：Cache First
  if (
    event.request.destination === "script" ||
    event.request.destination === "style" ||
    event.request.destination === "image" ||
    event.request.destination === "font"
  ) {
    event.respondWith(
      caches.match(event.request).then(
        (cached) =>
          cached ||
          fetch(event.request).then((response) => {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
            return response;
          })
      )
    );
    return;
  }

  // 页面导航：Network First，失败时降级到缓存
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match("/index.html")
      )
    );
    return;
  }
});
