import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import App from './App.vue'
import router from './router'
import './styles/main.css'

// Service Worker 注册：只在浏览器PWA环境需要，Tauri桌面端跳过
// Tauri 的自定义协议不支持 SW，注册后会拦截所有请求导致白屏
if ('serviceWorker' in navigator && !window.__TAURI_INTERNALS__) {
  navigator.serviceWorker.register(import.meta.env.BASE_URL + 'sw.js').catch(function() {})
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
