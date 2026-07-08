<template>
  <div class="snake-container">
    <!-- 游戏画布区 -->
    <div class="game-area">
      <canvas ref="canvasRef" :width="canvasWidth" :height="canvasHeight"></canvas>

      <!-- 开始提示 -->
      <div v-if="!gameStarted" class="overlay">
        <div class="overlay-box">
          <h3>🐍 贪吃蛇</h3>
          <p>按方向键开始游戏</p>
          <el-button type="primary" @click="startGame">开始</el-button>
        </div>
      </div>

      <!-- 游戏结束遮罩 -->
      <div v-if="gameOver" class="overlay">
        <div class="overlay-box">
          <h3>游戏结束</h3>
          <p>得分：<strong>{{ score }}</strong></p>
          <el-button type="primary" @click="startGame">再来一局</el-button>
        </div>
      </div>

      <!-- 暂停遮罩 -->
      <div v-if="paused && gameStarted && !gameOver" class="overlay">
        <div class="overlay-box">
          <h3>已暂停</h3>
          <el-button type="primary" @click="togglePause">继续</el-button>
        </div>
      </div>
    </div>

    <!-- 右侧信息面板 -->
    <div class="info-panel">
      <div class="panel-card">
        <div class="panel-label">🐍 长度</div>
        <div class="panel-value">{{ snake.length }}</div>
      </div>
      <div class="panel-card">
        <div class="panel-label">⭐ 得分</div>
        <div class="panel-value">{{ score }}</div>
      </div>
      <div class="panel-card">
        <div class="panel-label">⚡ 速度</div>
        <div class="panel-value">Lv.{{ level }}</div>
      </div>
      <div class="panel-buttons">
        <el-button type="primary" @click="startGame" size="small">
          {{ gameStarted ? '重新开始' : '开始游戏' }}
        </el-button>
        <el-button @click="togglePause" size="small" :disabled="!gameStarted || gameOver">
          暂停 / 继续
        </el-button>
      </div>
      <div class="panel-tips">
        <p><strong>操作说明</strong></p>
        <p>↑ ↓ ← → 控制方向</p>
        <p>P 暂停 / 继续</p>
        <p>空格 重新开始</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

// ---- DOM 引用 ----
const canvasRef = ref(null)

// ---- 画布尺寸 ----
const COLS = 20        // 列数（水平格子数）
const ROWS = 20        // 行数（垂直格子数）
const CELL = 22         // 每格像素
const canvasWidth = COLS * CELL
const canvasHeight = ROWS * CELL

// ---- 游戏状态 ----
const snake = ref([])          // [{x, y}, ...] 蛇头在前
const score = ref(0)
const level = ref(1)
const gameStarted = ref(false)
const gameOver = ref(false)
const paused = ref(false)

// ---- 游戏内部变量 ----
let direction = { x: 1, y: 0 }   // 当前移动方向
let nextDirection = { x: 1, y: 0 } // 缓存的输入方向（防止一帧内反向）
let food = { x: 10, y: 10 }       // 食物位置
let gameLoopId = null
let moveInterval = 150            // 移动间隔（毫秒）
let lastMoveTime = 0
let ctx = null

// ---- Canvas 渲染 ----

/** 绘制一帧 */
function draw() {
  if (!ctx) return
  // 背景
  ctx.fillStyle = '#1a1a2e'
  ctx.fillRect(0, 0, canvasWidth, canvasHeight)
  // 网格线
  ctx.strokeStyle = '#2a2a4a'
  ctx.lineWidth = 0.3
  for (let r = 0; r <= ROWS; r++) {
    ctx.beginPath(); ctx.moveTo(0, r * CELL); ctx.lineTo(COLS * CELL, r * CELL); ctx.stroke()
  }
  for (let c = 0; c <= COLS; c++) {
    ctx.beginPath(); ctx.moveTo(c * CELL, 0); ctx.lineTo(c * CELL, ROWS * CELL); ctx.stroke()
  }
  // 食物
  drawFood()
  // 蛇
  drawSnake()
}

/** 绘制食物 */
function drawFood() {
  const cx = food.x * CELL + CELL / 2
  const cy = food.y * CELL + CELL / 2
  const radius = CELL / 2 - 2
  // 发光效果
  ctx.shadowColor = '#ff4757'
  ctx.shadowBlur = 8
  ctx.fillStyle = '#ff4757'
  ctx.beginPath()
  ctx.arc(cx, cy, radius, 0, Math.PI * 2)
  ctx.fill()
  ctx.shadowBlur = 0
}

/** 绘制蛇 */
function drawSnake() {
  const s = snake.value
  for (let i = 0; i < s.length; i++) {
    const { x, y } = s[i]
    const px = x * CELL + 1
    const py = y * CELL + 1
    const size = CELL - 2
    // 蛇身渐变色：头部亮，尾部暗
    const t = i / Math.max(s.length - 1, 1)
    const r = Math.round(45 + t * 30)
    const g = Math.round(200 - t * 100)
    const b = Math.round(100 - t * 50)
    ctx.fillStyle = `rgb(${r},${g},${b})`
    ctx.fillRect(px, py, size, size)
    // 蛇头两只眼睛
    if (i === 0) {
      ctx.fillStyle = '#fff'
      const eyeSize = size / 5
      // 根据方向调整眼睛位置
      let ex1, ey1, ex2, ey2
      if (direction.x === 1) {        // 向右
        ex1 = px + size * 0.65; ey1 = py + size * 0.25
        ex2 = px + size * 0.65; ey2 = py + size * 0.65
      } else if (direction.x === -1) { // 向左
        ex1 = px + size * 0.35; ey1 = py + size * 0.25
        ex2 = px + size * 0.35; ey2 = py + size * 0.65
      } else if (direction.y === -1) { // 向上
        ex1 = px + size * 0.25; ey1 = py + size * 0.35
        ex2 = px + size * 0.65; ey2 = py + size * 0.35
      } else {                          // 向下
        ex1 = px + size * 0.25; ey1 = py + size * 0.65
        ex2 = px + size * 0.65; ey2 = py + size * 0.65
      }
      ctx.beginPath()
      ctx.arc(ex1, ey1, eyeSize, 0, Math.PI * 2); ctx.fill()
      ctx.arc(ex2, ey2, eyeSize, 0, Math.PI * 2); ctx.fill()
      // 瞳孔
      ctx.fillStyle = '#1a1a2e'
      ctx.beginPath()
      ctx.arc(ex1, ey1, eyeSize / 2.5, 0, Math.PI * 2); ctx.fill()
      ctx.arc(ex2, ey2, eyeSize / 2.5, 0, Math.PI * 2); ctx.fill()
    }
  }
}

// ---- 游戏逻辑 ----

/** 生成不与蛇重叠的食物位置 */
function spawnFood() {
  const s = snake.value
  const occupied = new Set(s.map(p => `${p.x},${p.y}`))
  const free = []
  for (let x = 0; x < COLS; x++) {
    for (let y = 0; y < ROWS; y++) {
      if (!occupied.has(`${x},${y}`)) free.push({ x, y })
    }
  }
  if (free.length === 0) return // 蛇占满棋盘（极罕见）
  food = free[Math.floor(Math.random() * free.length)]
}

/** 初始化蛇（从中间开始）*/
function initSnake() {
  const startX = Math.floor(COLS / 2)
  const startY = Math.floor(ROWS / 2)
  snake.value = [
    { x: startX, y: startY },
    { x: startX - 1, y: startY },
    { x: startX - 2, y: startY }
  ]
  direction = { x: 1, y: 0 }
  nextDirection = { x: 1, y: 0 }
}

/** 移动蛇 */
function moveSnake() {
  // 应用缓存的合法方向
  direction = { ...nextDirection }
  const head = snake.value[0]
  const newHead = {
    x: head.x + direction.x,
    y: head.y + direction.y
  }
  // 撞墙检测
  if (newHead.x < 0 || newHead.x >= COLS || newHead.y < 0 || newHead.y >= ROWS) {
    endGame()
    return
  }
  // 撞自己检测
  if (snake.value.some(seg => seg.x === newHead.x && seg.y === newHead.y)) {
    endGame()
    return
  }
  // 新蛇头
  const newSnake = [newHead, ...snake.value]
  // 判断是否吃到食物
  if (newHead.x === food.x && newHead.y === food.y) {
    score.value += 10
    // 每吃5个加速
    if (score.value % 50 === 0) {
      level.value++
      moveInterval = Math.max(50, moveInterval - 15)
    }
    spawnFood()
  } else {
    newSnake.pop() // 去掉尾巴
  }
  snake.value = newSnake
}

/** 结束游戏 */
function endGame() {
  gameOver.value = true
  gameStarted.value = false
  if (gameLoopId) {
    cancelAnimationFrame(gameLoopId)
    gameLoopId = null
  }
}

/** 切换暂停 */
function togglePause() {
  if (!gameStarted.value || gameOver.value) return
  paused.value = !paused.value
}

// ---- 游戏循环 ----

function gameLoop(timestamp) {
  if (gameStarted.value && !gameOver.value && !paused.value) {
    if (timestamp - lastMoveTime > moveInterval) {
      moveSnake()
      lastMoveTime = timestamp
    }
  }
  draw()
  gameLoopId = requestAnimationFrame(gameLoop)
}

// ---- 开始 / 重置 ----

function startGame() {
  initSnake()
  score.value = 0
  level.value = 1
  gameOver.value = false
  paused.value = false
  gameStarted.value = true
  moveInterval = 150
  lastMoveTime = performance.now()
  spawnFood()
  if (gameLoopId) cancelAnimationFrame(gameLoopId)
  gameLoopId = requestAnimationFrame(gameLoop)
}

// ---- 键盘事件 ----

function onKeyDown(e) {
  if (!gameStarted.value || gameOver.value) {
    if (e.key === ' ' || e.key === 'Enter') {
      startGame()
      e.preventDefault()
    }
    return
  }
  if (e.key === 'p' || e.key === 'P') {
    togglePause()
    return
  }
  if (paused.value) return
  // 方向控制（禁止原地掉头）
  switch (e.key) {
    case 'ArrowUp':
      if (direction.y !== 1) nextDirection = { x: 0, y: -1 }
      e.preventDefault(); break
    case 'ArrowDown':
      if (direction.y !== -1) nextDirection = { x: 0, y: 1 }
      e.preventDefault(); break
    case 'ArrowLeft':
      if (direction.x !== 1) nextDirection = { x: -1, y: 0 }
      e.preventDefault(); break
    case 'ArrowRight':
      if (direction.x !== -1) nextDirection = { x: 1, y: 0 }
      e.preventDefault(); break
    case ' ':
      startGame()
      e.preventDefault(); break
  }
}

// ---- 生命周期 ----

onMounted(() => {
  ctx = canvasRef.value?.getContext('2d')
  draw()
  window.addEventListener('keydown', onKeyDown)
})

onUnmounted(() => {
  if (gameLoopId) cancelAnimationFrame(gameLoopId)
  window.removeEventListener('keydown', onKeyDown)
})
</script>

<style scoped>
.snake-container {
  display: flex;
  gap: 20px;
  justify-content: center;
  align-items: flex-start;
  flex-wrap: wrap;
}

.game-area {
  position: relative;
  border: 2px solid #67c23a;
  border-radius: 4px;
  overflow: hidden;
  line-height: 0;
}

.game-area canvas {
  display: block;
  outline: none;
}

/* 遮罩层 */
.overlay {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.7);
  display: flex;
  align-items: center;
  justify-content: center;
}
.overlay-box {
  text-align: center;
  color: #fff;
}
.overlay-box h3 {
  margin: 0 0 12px 0;
  font-size: 22px;
}
.overlay-box p {
  margin: 0 0 16px 0;
  font-size: 18px;
}

/* 信息面板 */
.info-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 150px;
}
.panel-card {
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 12px;
  text-align: center;
}
.panel-label {
  font-size: 13px;
  color: #909399;
  margin-bottom: 6px;
}
.panel-value {
  font-size: 24px;
  font-weight: 700;
  color: #303133;
}
.panel-buttons {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.panel-tips {
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 12px;
  font-size: 12px;
  color: #909399;
  line-height: 1.8;
}
.panel-tips p { margin: 0; }
</style>
