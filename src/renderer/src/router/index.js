import { createRouter, createWebHashHistory } from 'vue-router'
import Home from '../views/Home.vue'
import Statistics from '../views/Statistics.vue'

const routes = [
  {
    path: '/',
    name: 'home',
    component: Home,
    meta: { title: '记账本' }
  },
  {
    path: '/statistics',
    name: 'statistics',
    component: Statistics,
    meta: { title: '统计' }
  }
]

const router = createRouter({
  history: createWebHashHistory(), // 使用 hash 模式，Electron 环境最稳定
  routes
})

export default router
