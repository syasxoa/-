import { createRouter, createWebHashHistory } from 'vue-router'
import Home from '../views/Home.vue'
import Statistics from '../views/Statistics.vue'
import CategoryManage from '../views/CategoryManage.vue'

const routes = [
  { path: '/', name: 'home', component: Home, meta: { title: '记账本' } },
  { path: '/statistics', name: 'statistics', component: Statistics, meta: { title: '统计' } },
  { path: '/categories', name: 'categories', component: CategoryManage, meta: { title: '分类管理' } }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
