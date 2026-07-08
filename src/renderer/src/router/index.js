import { createRouter, createWebHashHistory } from 'vue-router'
import Home from '../views/Home.vue'
import Statistics from '../views/Statistics.vue'
import Games from '../views/Games.vue'

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
  },
  {
    path: '/games',
    name: 'games',
    component: Games,
    meta: { title: '小游戏' }
  }
]

const router = createRouter({
  history: createWebHashHistory(), // 使用 hash 模式，Electron 环境最稳定
  routes
})

export default router
