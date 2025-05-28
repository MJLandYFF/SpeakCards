// SpeakCards Service Worker
// 缓存版本
const CACHE_NAME = 'speakcards-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/main.js',
  '/style.css',
  '/words.js',
  '/tts-config.js',
  '/tts-manager.js',
  '/tts-cache.js',
  '/mobile-audio-fix.js',
  '/LOGO.ico',
  '/LOGO.jpeg',
  '/manifest.json'
];

// 安装事件 - 缓存资源
self.addEventListener('install', function(event) {
  console.log('[SW] 安装中...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('[SW] 缓存文件');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// 激活事件 - 清理旧缓存
self.addEventListener('activate', function(event) {
  console.log('[SW] 激活中...');
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] 清理旧缓存:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 拦截请求 - 缓存优先策略
self.addEventListener('fetch', function(event) {
  // 只处理GET请求
  if (event.request.method !== 'GET') {
    return;
  }
  
  // 跳过TTS API请求
  if (event.request.url.includes('/tts') || event.request.url.includes('baidu') || event.request.url.includes('elevenlabs')) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // 如果缓存中有，直接返回
        if (response) {
          return response;
        }
        
        // 否则从网络获取
        return fetch(event.request).then(function(response) {
          // 检查是否是有效响应
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          // 克隆响应用于缓存
          const responseToCache = response.clone();
          
          caches.open(CACHE_NAME)
            .then(function(cache) {
              cache.put(event.request, responseToCache);
            });
          
          return response;
        });
      })
  );
});

// 消息处理
self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// 后台同步（可选）
self.addEventListener('sync', function(event) {
  if (event.tag === 'background-sync') {
    console.log('[SW] 后台同步触发');
  }
});
