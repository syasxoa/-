// 轻松记账 - Service Worker（PWA 离线缓存）
const CACHE_NAME = 'qing-song-ji-zhang-v2'

// 安装：预缓存核心文件，install 失败不影响应用正常运行
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(['/', '/index.html']).catch(function() {})
    }).then(function() { return self.skipWaiting() })
  )
})

// 激活：清理旧版本缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(keys.filter(function(k) { return k !== CACHE_NAME }).map(function(k) { return caches.delete(k) }))
    }).then(function() { return self.clients.claim() })
  )
})

// 请求：网络优先，缓存兜底。跳过非 HTTP 请求（Tauri 等自定义协议不会被拦截）
self.addEventListener('fetch', (event) => {
  if (!event.request.url.startsWith('http')) return

  event.respondWith(
    fetch(event.request).then(function(response) {
      if (response.status === 200) {
        var clone = response.clone()
        caches.open(CACHE_NAME).then(function(cache) { cache.put(event.request, clone) })
      }
      return response
    }).catch(function() {
      return caches.match(event.request).then(function(cached) {
        if (cached) return cached
        if (event.request.mode === 'navigate') return caches.match('/index.html')
        return new Response('离线状态，请连接网络后重试', { status: 503 })
      })
    })
  )
})
