<template>
  <div class="games-page">
    <el-tabs v-model="activeGame" type="border-card" class="game-tabs">
      <!-- 俄罗斯方块 -->
      <el-tab-pane label="🧱 俄罗斯方块" name="tetris">
        <TetrisGame />
      </el-tab-pane>
      <!-- 贪吃蛇 -->
      <el-tab-pane label="🐍 贪吃蛇" name="snake">
        <SnakeGame />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import TetrisGame from '../components/TetrisGame.vue'
import SnakeGame from '../components/SnakeGame.vue'

const activeGame = ref('tetris')
</script>

<style scoped>
.games-page {
  max-width: 820px;
  margin: 0 auto;
}

.game-tabs {
  box-shadow: 0 2px 12px rgba(0,0,0,0.08);
}
</style>
