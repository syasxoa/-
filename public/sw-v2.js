// 轻松记账 - Service Worker v2（网络优先策略，避免缓存导致白屏）
const CACHE_NAME = 'jizhang-v4'

// 安装时跳过缓存（网络优先不需要预缓存）
self.addEventListener('install', () => {
  self.skipWaiting()
})

// 激活时清理所有旧缓存（包括 v1/v2/v3 的任何残留）
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys.map((k) => caches.delete(k)))
    }).then(() => self.clients.claim())
  )
})

// 网络优先策略：始终用最新内容，仅在离线时使用缓存
self.addEventListener('fetch', (event) => {
  if (!event.request.url.startsWith('http')) return

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // 只缓存成功的 HTML/JS/CSS 响应
        if (response.status === 200) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
        }
        return response
      })
      .catch(() => {
        // 网络失败 → 尝试从缓存返回
        return caches.match(event.request).then((cached) => {
          if (cached) return cached
          // 导航请求未命中缓存 → 返回缓存的首页
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html') || caches.match('./index.html')
          }
          return new Response('当前无网络连接', { status: 503 })
        })
      })
  )
})
