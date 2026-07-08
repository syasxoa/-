<template>
  <div id="app">
    <el-container class="app-container">
      <!-- 顶部导航 -->
      <el-header class="app-header">
        <div class="header-left">
          <span class="app-logo">📒</span>
          <span class="app-title">轻松记账</span>
        </div>
        <div class="header-right">
          <el-menu
            :default-active="activeMenu"
            mode="horizontal"
            :ellipsis="false"
            @select="handleMenuSelect"
            class="nav-menu"
          >
            <el-menu-item index="/">
              <el-icon><List /></el-icon>
              <span>记账本</span>
            </el-menu-item>
            <el-menu-item index="/statistics">
              <el-icon><PieChart /></el-icon>
              <span>统计</span>
            </el-menu-item>
          </el-menu>
        </div>
      </el-header>

      <!-- 主内容区 -->
      <el-main class="app-main">
        <router-view />
      </el-main>
    </el-container>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { List, PieChart } from '@element-plus/icons-vue'

const router = useRouter()
const route = useRoute()

const activeMenu = computed(() => route.path)

function handleMenuSelect(index) {
  router.push(index)
}
</script>

<style scoped>
.app-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  border-bottom: 1px solid #e4e7ed;
  padding: 0 20px;
  height: 56px;
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.app-logo {
  font-size: 28px;
}

.app-title {
  font-size: 20px;
  font-weight: 700;
  color: #303133;
  letter-spacing: 1px;
}

.nav-menu {
  border-bottom: none !important;
}

.nav-menu .el-menu-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.app-main {
  flex: 1;
  background: #f5f7fa;
  padding: 20px;
  overflow-y: auto;
}
</style>
