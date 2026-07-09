// 轻松记账 - Service Worker 自毁版本
// 此文件仅用于清除旧 SW 残留。新 SW 请见 sw-v2.js

self.addEventListener('install', () => {
  // 立即接管，不等旧 SW 释放
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      // 删除所有缓存（旧版 HTML/JS/CSS 全部清除）
      return Promise.all(keys.map((k) => caches.delete(k)))
    }).then(() => {
      // 强制所有打开的页面刷新，让它们加载最新内容（不再经过旧 SW）
      return self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.navigate(client.url)
        })
      })
    })
  )
})

// 不拦截任何请求——让页面直接走网络
self.addEventListener('fetch', (event) => {
  // 空处理，所有请求直接走浏览器网络层
})
