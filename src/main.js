import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import App from './App.vue'
import router from './router'
import './styles/main.css'

// 注册 PWA Service Worker（Vite 构建时 import.meta.env.BASE_URL 自动替换为 / 或 /-/ ）
// 先清理所有旧的 Service Worker 注册（避免路径变更后旧 SW 继续拦截请求导致白屏）
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function(registrations) {
    var promises = []
    for (var i = 0; i < registrations.length; i++) {
      promises.push(registrations[i].unregister())
    }
    return Promise.all(promises)
  }).then(function() {
    // 旧 SW 全部清理完毕，注册新的
    return navigator.serviceWorker.register(import.meta.env.BASE_URL + 'sw.js')
  }).catch(function() {
    // 清理失败也尝试注册新的（降级处理）
    navigator.serviceWorker.register(import.meta.env.BASE_URL + 'sw.js').catch(function() {})
  })
}

const app = createApp(App)

// 注册所有 Element Plus 图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.use(createPinia())
app.use(router)
app.use(ElementPlus, { locale: zhCn }) // Element Plus 中文

app.mount('#app')
