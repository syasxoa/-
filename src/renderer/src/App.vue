<template>
  <div id="app">
    <el-container class="app-container">
      <!-- 顶部标题栏（手机端仅显示Logo+标题） -->
      <el-header class="app-header">
        <div class="header-left">
          <span class="app-logo">📒</span>
          <span class="app-title">轻松记账</span>
        </div>
        <!-- 电脑端：顶部导航菜单 -->
        <div class="header-right desktop-nav">
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
            <el-menu-item index="/categories">
              <el-icon><FolderOpened /></el-icon>
              <span>分类</span>
            </el-menu-item>
            <el-menu-item index="/games">
              <el-icon><VideoPlay /></el-icon>
              <span>小游戏</span>
            </el-menu-item>
          </el-menu>
        </div>
      </el-header>

      <!-- 主内容区 -->
      <el-main class="app-main">
        <router-view />
      </el-main>

      <!-- 手机端：底部导航栏 -->
      <footer class="mobile-nav">
        <div
          v-for="item in tabs"
          :key="item.path"
          class="tab-item"
          :class="{ active: activeMenu === item.path }"
          @click="handleMenuSelect(item.path)"
        >
          <el-icon :size="20"><component :is="item.icon" /></el-icon>
          <span class="tab-label">{{ item.label }}</span>
        </div>
      </footer>
    </el-container>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { List, PieChart, FolderOpened, VideoPlay } from '@element-plus/icons-vue'

const router = useRouter()
const route = useRoute()

const activeMenu = computed(() => route.path)

const tabs = [
  { path: '/', label: '记账本', icon: List },
  { path: '/statistics', label: '统计', icon: PieChart },
  { path: '/categories', label: '分类', icon: FolderOpened },
  { path: '/games', label: '小游戏', icon: VideoPlay }
]

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

/* ===== 顶部标题栏 ===== */
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

/* ===== 电脑端顶部导航 ===== */
.nav-menu {
  border-bottom: none !important;
}

.nav-menu .el-menu-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

/* ===== 手机端底部导航（默认隐藏）===== */
.mobile-nav {
  display: none;
}

.app-main {
  flex: 1;
  background: #f5f7fa;
  padding: 20px;
  overflow-y: auto;
}

/* ===== 响应式 ===== */
@media (max-width: 768px) {
  /* 顶部只显示标题，隐藏菜单 */
  .app-header {
    padding: 0 12px;
    height: 48px;
    justify-content: center;
  }

  .app-title { font-size: 18px; }
  .app-logo { font-size: 22px; }

  /* 隐藏电脑端导航 */
  .desktop-nav {
    display: none;
  }

  /* 内容区需要腾出底部栏的空间 */
  .app-main {
    padding: 12px;
    padding-bottom: 0;
  }

  /* 显示底部导航栏 */
  .mobile-nav {
    display: flex;
    justify-content: space-around;
    align-items: center;
    background: #fff;
    border-top: 1px solid #e4e7ed;
    height: 56px;
    flex-shrink: 0;
    padding-bottom: env(safe-area-inset-bottom); /* iPhone 刘海屏适配 */
  }

  .tab-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    flex: 1;
    height: 100%;
    color: #909399;
    cursor: pointer;
    user-select: none;
    transition: color 0.2s;
  }

  .tab-item.active {
    color: #409eff;
  }

  .tab-label {
    font-size: 11px;
  }
}
</style>
