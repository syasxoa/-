// 轻松记账 - Service Worker（PWA 离线缓存）
const CACHE_NAME = 'qing-song-ji-zhang-v3'

// 安装：预缓存核心文件
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // 使用相对路径预缓存首页，自动适配 / 或 /-/ 的部署路径
      return cache.addAll(['./', './index.html']).catch(() => {
        // 部分文件加载失败不影响安装
      })
    }).then(() => self.skipWaiting())
  )
})

// 激活：清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    }).then(() => self.clients.claim())
  )
})

// 请求：缓存优先策略（离线可用）
self.addEventListener('fetch', (event) => {
  // 跳过 chrome-extension 等非 http/https 请求
  if (!event.request.url.startsWith('http')) return

  event.respondWith(
    caches.match(event.request).then((cached) => {
      // 命中缓存直接返回
      if (cached) return cached
      // 否则走网络，成功后缓存副本
      return fetch(event.request).then((response) => {
        if (response.status === 200) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
        }
        return response
      }).catch(() => {
        // 网络失败且无缓存 → 尝试返回首页（SPA fallback）
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html')
        }
        return new Response('离线状态，请连接网络后重试', { status: 503 })
      })
    })
  )
})
