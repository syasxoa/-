<template>
  <div class="snake-container">
    <!-- 游戏画布区 -->
    <div class="game-area">
      <canvas ref="canvasRef" :width="canvasWidth" :height="canvasHeight"></canvas>

      <!-- 开始遮罩（仅在未开始且未结束时显示，解决与结束遮罩重叠的bug） -->
      <div v-if="!gameStarted && !gameOver" class="overlay">
        <div class="overlay-box">
          <h3>🐍 贪吃蛇</h3>
          <el-button type="primary" @click="startGame" size="large">开始游戏</el-button>
          <p class="overlay-tips">↑ ↓ ← → 控制方向</p>
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
        <div class="panel-label">📊 等级</div>
        <div class="panel-value">Lv.{{ level }}</div>
      </div>

      <!-- 速度选择器 -->
      <div class="panel-card panel-speed">
        <div class="panel-label">⚡ 速度调节</div>
        <div class="speed-buttons">
          <el-button
            v-for="opt in speedOptions"
            :key="opt.value"
            :type="speedLevel === opt.value ? 'primary' : ''"
            size="small"
            @click="setSpeed(opt.value)"
            plain
          >{{ opt.label }}</el-button>
        </div>
      </div>

      <div class="panel-buttons">
        <el-button type="primary" @click="startGame" size="small">
          {{ gameStarted ? '重新开始' : '开始游戏' }}
        </el-button>
        <el-button @click="togglePause" size="small" :disabled="!gameStarted || gameOver">
          暂停 / 继续
        </el-button>
      </div>

      <!-- 触屏方向按钮 -->
      <div class="touch-controls">
        <div class="touch-label">触摸操作</div>
        <div class="touch-row">
          <el-button class="touch-btn" @pointerdown.prevent="changeDir(0, -1)" size="small">▲</el-button>
        </div>
        <div class="touch-row">
          <el-button class="touch-btn" @pointerdown.prevent="changeDir(-1, 0)" size="small">◀</el-button>
          <el-button class="touch-btn" @pointerdown.prevent="changeDir(0, 1)" size="small">▼</el-button>
          <el-button class="touch-btn" @pointerdown.prevent="changeDir(1, 0)" size="small">▶</el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

// ---- DOM 引用 ----
const canvasRef = ref(null)

// ---- 画布尺寸 ----
const COLS = 20
const ROWS = 20
const CELL = 22
const canvasWidth = COLS * CELL
const canvasHeight = ROWS * CELL

// ---- 速度选项 ----
const speedOptions = [
  { label: '🐢 慢速', value: 0 },
  { label: '🐇 普通', value: 1 },
  { label: '🐎 快速', value: 2 },
  { label: '🚀 极速', value: 3 }
]
const speedLevel = ref(1)

// ---- 游戏状态 ----
const snake = ref([])
const score = ref(0)
const level = ref(1)
const gameStarted = ref(false)
const gameOver = ref(false)
const paused = ref(false)

// ---- 内部变量 ----
let direction = { x: 1, y: 0 }
let nextDirection = { x: 1, y: 0 }
let food = { x: 10, y: 10 }
let gameLoopId = null
let baseMoveInterval = 150
let moveInterval = 150
let lastMoveTime = 0
let ctx = null

// ---- 速度调节 ----
function setSpeed(val) {
  speedLevel.value = val
  updateMoveInterval()
}

function updateMoveInterval() {
  const multipliers = [1.8, 1.0, 0.55, 0.3]
  const factor = multipliers[speedLevel.value] || 1.0
  moveInterval = Math.max(30, Math.floor(baseMoveInterval * factor - (level.value - 1) * 8))
}

function changeDir(dx, dy) {
  if (!gameStarted.value || gameOver.value || paused.value) return
  if (dx === -1 && direction.x === 1) return
  if (dx === 1 && direction.x === -1) return
  if (dy === -1 && direction.y === 1) return
  if (dy === 1 && direction.y === -1) return
  nextDirection = { x: dx, y: dy }
}

// ---- 渲染 ----

function draw() {
  if (!ctx) return
  ctx.fillStyle = '#1a1a2e'
  ctx.fillRect(0, 0, canvasWidth, canvasHeight)
  ctx.strokeStyle = '#2a2a4a'; ctx.lineWidth = 0.3
  for (let r = 0; r <= ROWS; r++) { ctx.beginPath(); ctx.moveTo(0, r * CELL); ctx.lineTo(COLS * CELL, r * CELL); ctx.stroke() }
  for (let c = 0; c <= COLS; c++) { ctx.beginPath(); ctx.moveTo(c * CELL, 0); ctx.lineTo(c * CELL, ROWS * CELL); ctx.stroke() }
  drawFood()
  drawSnake()
}

function drawFood() {
  const cx = food.x * CELL + CELL / 2, cy = food.y * CELL + CELL / 2
  const radius = CELL / 2 - 2
  ctx.shadowColor = '#ff4757'; ctx.shadowBlur = 8
  ctx.fillStyle = '#ff4757'
  ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2); ctx.fill()
  ctx.shadowBlur = 0
}

function drawSnake() {
  const s = snake.value
  for (let i = 0; i < s.length; i++) {
    const { x, y } = s[i]
    const px = x * CELL + 1, py = y * CELL + 1, size = CELL - 2
    const t = i / Math.max(s.length - 1, 1)
    const r = Math.round(45 + t * 30), g = Math.round(200 - t * 100), b = Math.round(100 - t * 50)
    ctx.fillStyle = `rgb(${r},${g},${b})`
    ctx.fillRect(px, py, size, size)
    if (i === 0) {
      ctx.fillStyle = '#fff'
      const eyeSize = size / 5
      let ex1, ey1, ex2, ey2
      if (direction.x === 1)       { ex1 = px + size * 0.65; ey1 = py + size * 0.25; ex2 = px + size * 0.65; ey2 = py + size * 0.65 }
      else if (direction.x === -1) { ex1 = px + size * 0.35; ey1 = py + size * 0.25; ex2 = px + size * 0.35; ey2 = py + size * 0.65 }
      else if (direction.y === -1) { ex1 = px + size * 0.25; ey1 = py + size * 0.35; ex2 = px + size * 0.65; ey2 = py + size * 0.35 }
      else                         { ex1 = px + size * 0.25; ey1 = py + size * 0.65; ex2 = px + size * 0.65; ey2 = py + size * 0.65 }
      ctx.beginPath(); ctx.arc(ex1, ey1, eyeSize, 0, Math.PI * 2); ctx.fill()
      ctx.arc(ex2, ey2, eyeSize, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#1a1a2e'
      ctx.beginPath(); ctx.arc(ex1, ey1, eyeSize / 2.5, 0, Math.PI * 2); ctx.fill()
      ctx.arc(ex2, ey2, eyeSize / 2.5, 0, Math.PI * 2); ctx.fill()
    }
  }
}

// ---- 游戏逻辑 ----

function spawnFood() {
  const s = snake.value
  const occupied = new Set(s.map(p => `${p.x},${p.y}`))
  const free = []
  for (let x = 0; x < COLS; x++) for (let y = 0; y < ROWS; y++) if (!occupied.has(`${x},${y}`)) free.push({ x, y })
  if (free.length === 0) return
  food = free[Math.floor(Math.random() * free.length)]
}

function initSnake() {
  const startX = Math.floor(COLS / 2), startY = Math.floor(ROWS / 2)
  snake.value = [{ x: startX, y: startY }, { x: startX - 1, y: startY }, { x: startX - 2, y: startY }]
  direction = { x: 1, y: 0 }
  nextDirection = { x: 1, y: 0 }
}

function moveSnake() {
  direction = { ...nextDirection }
  const head = snake.value[0]
  const newHead = { x: head.x + direction.x, y: head.y + direction.y }
  if (newHead.x < 0 || newHead.x >= COLS || newHead.y < 0 || newHead.y >= ROWS) { endGame(); return }
  if (snake.value.some(seg => seg.x === newHead.x && seg.y === newHead.y)) { endGame(); return }
  const newSnake = [newHead, ...snake.value]
  if (newHead.x === food.x && newHead.y === food.y) {
    score.value += 10
    if (score.value % 50 === 0) { level.value++; updateMoveInterval() }
    spawnFood()
  } else {
    newSnake.pop()
  }
  snake.value = newSnake
}

function endGame() {
  gameOver.value = true
  gameStarted.value = false
  if (gameLoopId) { cancelAnimationFrame(gameLoopId); gameLoopId = null }
}

function togglePause() {
  if (!gameStarted.value || gameOver.value) return
  paused.value = !paused.value
}

// ---- 游戏循环 ----

function gameLoop(timestamp) {
  if (gameStarted.value && !gameOver.value && !paused.value) {
    if (timestamp - lastMoveTime > moveInterval) { moveSnake(); lastMoveTime = timestamp }
  }
  draw()
  gameLoopId = requestAnimationFrame(gameLoop)
}

// ---- 开始 ----

function startGame() {
  initSnake()
  score.value = 0; level.value = 1
  gameOver.value = false; paused.value = false; gameStarted.value = true
  updateMoveInterval(); lastMoveTime = performance.now()
  spawnFood()
  if (gameLoopId) cancelAnimationFrame(gameLoopId)
  gameLoopId = requestAnimationFrame(gameLoop)
}

// ---- 键盘 ----

function onKeyDown(e) {
  if (!gameStarted.value || gameOver.value) {
    if (e.key === ' ' || e.key === 'Enter') { startGame(); e.preventDefault() }
    return
  }
  if (e.key === 'p' || e.key === 'P') { togglePause(); return }
  if (paused.value) return
  switch (e.key) {
    case 'ArrowUp': changeDir(0, -1); e.preventDefault(); break
    case 'ArrowDown': changeDir(0, 1); e.preventDefault(); break
    case 'ArrowLeft': changeDir(-1, 0); e.preventDefault(); break
    case 'ArrowRight': changeDir(1, 0); e.preventDefault(); break
    case ' ': startGame(); e.preventDefault(); break
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

/* 遮罩层（开始 / 暂停 / 结束 统一复用）*/
.overlay {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.75);
  display: flex;
  align-items: center;
  justify-content: center;
}

.overlay-box {
  text-align: center;
  color: #fff;
}

.overlay-box h3 {
  margin: 0 0 16px 0;
  font-size: 24px;
}

.overlay-box p {
  margin: 0 0 16px 0;
  font-size: 18px;
}

.overlay-tips {
  margin-top: 14px !important;
  font-size: 13px !important;
  color: #c0c4cc;
  line-height: 1.8;
}

/* 信息面板 */
.info-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 164px;
}

.panel-card {
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 10px;
  text-align: center;
}

.panel-label {
  font-size: 13px;
  color: #909399;
  margin-bottom: 4px;
}

.panel-value {
  font-size: 24px;
  font-weight: 700;
  color: #303133;
}

.panel-speed {
  padding: 10px 8px;
}

.speed-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  justify-content: center;
  margin-top: 6px;
}

.speed-buttons .el-button {
  min-width: auto;
  padding: 4px 8px;
  font-size: 12px;
}

.panel-buttons {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* 触屏控制按钮 */
.touch-controls {
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 10px;
  text-align: center;
}

.touch-label {
  font-size: 12px;
  color: #c0c4cc;
  margin-bottom: 8px;
}

.touch-row {
  display: flex;
  justify-content: center;
  gap: 6px;
  margin-bottom: 4px;
}

.touch-btn {
  width: 40px !important;
  height: 36px !important;
  padding: 0 !important;
  font-size: 16px !important;
  user-select: none;
  touch-action: manipulation;
}

/* 手机端适配 */
@media (max-width: 768px) {
  .snake-container {
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }

  .info-panel {
    flex-direction: row;
    flex-wrap: wrap;
    gap: 8px;
    justify-content: center;
  }

  .panel-card {
    flex: 1 1 auto;
    min-width: 70px;
    padding: 8px;
  }

  .panel-value { font-size: 20px; }

  .panel-buttons { flex-direction: row; }

  .touch-controls { width: 100%; }
}
</style>
