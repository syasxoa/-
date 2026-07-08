<template>
  <div class="snake-root">
    <!-- ======== 状态一：开始菜单 ======== -->
    <div v-if="state === 'menu'" class="menu-screen">
      <div class="menu-card">
        <div class="menu-icon">🐍</div>
        <h2 class="menu-title">贪吃蛇</h2>
        <div class="menu-section">
          <div class="menu-label">游戏速度</div>
          <div class="speed-row">
            <el-button
              v-for="opt in speedOptions" :key="opt.value"
              :type="speedLevel === opt.value ? 'primary' : ''"
              @click="speedLevel = opt.value" size="large"
            >{{ opt.label }}</el-button>
          </div>
        </div>
        <div class="menu-section">
          <div class="menu-label">🏆 历史最佳</div>
          <div class="record-row">
            <div class="record-item">
              <span class="record-num">{{ bestScore }}</span><span class="record-unit">最高分</span>
            </div>
            <div class="record-item">
              <span class="record-num">{{ bestLength }}</span><span class="record-unit">最长蛇</span>
            </div>
          </div>
        </div>
        <el-button type="primary" size="large" class="start-btn" @click="startGame">🎮 开始游戏</el-button>
        <p class="menu-hint">↑ ↓ ← → 控制方向 &nbsp; P 暂停</p>
      </div>
    </div>

    <!-- ======== 状态二：游戏中 ======== -->
    <div v-else-if="state === 'playing'" class="play-screen">
      <div class="play-topbar">
        <span class="topbar-item">🐍 <strong>{{ snake.length }}</strong></span>
        <span class="topbar-item">⭐ <strong>{{ score }}</strong></span>
        <span class="topbar-item">📊 Lv.<strong>{{ level }}</strong></span>
        <span class="topbar-item">⚡ {{ speedOptions[speedLevel].label }}</span>
        <el-button size="small" @click="togglePause" class="topbar-pause">⏯ 暂停</el-button>
      </div>
      <div class="canvas-wrapper" ref="canvasWrapper">
        <canvas ref="canvasRef" class="play-canvas"></canvas>
        <div v-if="paused" class="pause-overlay">
          <div class="pause-card">
            <h3>⏸ 已暂停</h3>
            <el-button type="primary" size="large" @click="togglePause">继续游戏</el-button>
          </div>
        </div>
      </div>
      <div class="play-bottombar">
        <div class="touch-row">
          <button class="ctrl-btn" @pointerdown.prevent="changeDir(0, -1)">▲</button>
        </div>
        <div class="touch-row">
          <button class="ctrl-btn" @pointerdown.prevent="changeDir(-1, 0)">◀</button>
          <button class="ctrl-btn" @pointerdown.prevent="changeDir(0, 1)">▼</button>
          <button class="ctrl-btn" @pointerdown.prevent="changeDir(1, 0)">▶</button>
        </div>
      </div>
    </div>

    <!-- ======== 状态三：游戏结束 ======== -->
    <div v-else-if="state === 'gameover'" class="over-screen">
      <div class="over-card">
        <div class="over-icon">{{ score > bestScore ? '🎉' : '😵' }}</div>
        <h2 class="over-title">游戏结束</h2>
        <div class="over-stats">
          <div class="stat-row"><span>最终得分</span><strong>{{ score }}</strong></div>
          <div class="stat-row"><span>蛇身长度</span><strong>{{ snake.length }}</strong></div>
          <div class="stat-row"><span>达到等级</span><strong>Lv.{{ level }}</strong></div>
          <div class="stat-row"><span>历史最佳</span><strong>{{ bestScore }}</strong></div>
          <div v-if="score > bestScore" class="new-record">🎊 新纪录！</div>
        </div>
        <div class="over-btns">
          <el-button type="primary" size="large" @click="startGame">🔄 重新开始</el-button>
          <el-button size="large" @click="goBack">↩ 返回</el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'

const state = ref('menu')
const canvasRef = ref(null)
const canvasWrapper = ref(null)

const COLS = 20, ROWS = 20
let CELL = 26
let canvasWidth = COLS * CELL
let canvasHeight = ROWS * CELL

const speedOptions = [
  { label: '🐢 慢速', value: 0 },
  { label: '🐇 普通', value: 1 },
  { label: '🐎 快速', value: 2 },
  { label: '🚀 极速', value: 3 }
]
const speedLevel = ref(1)

const snake = ref([]), score = ref(0), level = ref(1), paused = ref(false)
const bestScore = ref(0), bestLength = ref(3)

let direction = { x: 1, y: 0 }, nextDirection = { x: 1, y: 0 }
let food = { x: 10, y: 10 }
let gameLoopId = null, moveInterval = 150, lastMoveTime = 0, ctx = null

function loadBest() {
  try { const d = JSON.parse(localStorage.getItem('snake_best') || '{}'); bestScore.value = d.score || 0; bestLength.value = d.length || 3 } catch { bestScore.value = 0; bestLength.value = 3 }
}
function saveBest() {
  if (score.value > bestScore.value || snake.value.length > bestLength.value) {
    localStorage.setItem('snake_best', JSON.stringify({ score: Math.max(score.value, bestScore.value), length: Math.max(snake.value.length, bestLength.value) }))
    loadBest()
  }
}

function updateMoveInterval() {
  const m = [1.8, 1.0, 0.55, 0.3]
  moveInterval = Math.max(30, Math.floor(150 * (m[speedLevel.value] || 1) - (level.value - 1) * 8))
}

function changeDir(dx, dy) {
  if (state.value !== 'playing' || paused.value) return
  if (dx === -1 && direction.x === 1) return
  if (dx === 1 && direction.x === -1) return
  if (dy === -1 && direction.y === 1) return
  if (dy === 1 && direction.y === -1) return
  nextDirection = { x: dx, y: dy }
}

function draw() {
  if (!ctx) return
  ctx.fillStyle = '#1a1a2e'; ctx.fillRect(0, 0, canvasWidth, canvasHeight)
  ctx.strokeStyle = '#2a2a4a'; ctx.lineWidth = 0.3
  for (let r = 0; r <= ROWS; r++) { ctx.beginPath(); ctx.moveTo(0, r * CELL); ctx.lineTo(COLS * CELL, r * CELL); ctx.stroke() }
  for (let c = 0; c <= COLS; c++) { ctx.beginPath(); ctx.moveTo(c * CELL, 0); ctx.lineTo(c * CELL, ROWS * CELL); ctx.stroke() }
  drawFood(); drawSnake()
}

function drawFood() {
  const cx = food.x * CELL + CELL / 2, cy = food.y * CELL + CELL / 2, radius = CELL / 2 - 3
  ctx.shadowColor = '#ff4757'; ctx.shadowBlur = 10
  ctx.fillStyle = '#ff4757'; ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0
}

function drawSnake() {
  const s = snake.value
  for (let i = 0; i < s.length; i++) {
    const { x, y } = s[i]; const px = x * CELL + 1, py = y * CELL + 1, size = CELL - 2
    ctx.fillStyle = `rgb(${Math.round(45 + (i / Math.max(s.length - 1, 1)) * 30)},${Math.round(200 - (i / Math.max(s.length - 1, 1)) * 100)},${Math.round(100 - (i / Math.max(s.length - 1, 1)) * 50)})`
    ctx.fillRect(px, py, size, size)
    if (i === 0) {
      ctx.fillStyle = '#fff'; const es = size / 5
      let ex1, ey1, ex2, ey2
      if (direction.x === 1)       { ex1 = px + size * 0.65; ey1 = py + size * 0.25; ex2 = px + size * 0.65; ey2 = py + size * 0.65 }
      else if (direction.x === -1) { ex1 = px + size * 0.35; ey1 = py + size * 0.25; ex2 = px + size * 0.35; ey2 = py + size * 0.65 }
      else if (direction.y === -1) { ex1 = px + size * 0.25; ey1 = py + size * 0.35; ex2 = px + size * 0.65; ey2 = py + size * 0.35 }
      else                         { ex1 = px + size * 0.25; ey1 = py + size * 0.65; ex2 = px + size * 0.65; ey2 = py + size * 0.65 }
      ctx.beginPath(); ctx.arc(ex1, ey1, es, 0, Math.PI * 2); ctx.fill(); ctx.arc(ex2, ey2, es, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#1a1a2e'
      ctx.beginPath(); ctx.arc(ex1, ey1, es / 2.5, 0, Math.PI * 2); ctx.fill(); ctx.arc(ex2, ey2, es / 2.5, 0, Math.PI * 2); ctx.fill()
    }
  }
}

function spawnFood() {
  const occupied = new Set(snake.value.map(p => `${p.x},${p.y}`))
  const free = []
  for (let x = 0; x < COLS; x++) for (let y = 0; y < ROWS; y++) if (!occupied.has(`${x},${y}`)) free.push({ x, y })
  if (free.length === 0) return
  food = free[Math.floor(Math.random() * free.length)]
}

function initSnake() {
  const sx = Math.floor(COLS / 2), sy = Math.floor(ROWS / 2)
  snake.value = [{ x: sx, y: sy }, { x: sx - 1, y: sy }, { x: sx - 2, y: sy }]
  direction = { x: 1, y: 0 }; nextDirection = { x: 1, y: 0 }
}

function moveSnake() {
  direction = { ...nextDirection }
  const nh = { x: snake.value[0].x + direction.x, y: snake.value[0].y + direction.y }
  if (nh.x < 0 || nh.x >= COLS || nh.y < 0 || nh.y >= ROWS) { endGame(); return }
  if (snake.value.some(seg => seg.x === nh.x && seg.y === nh.y)) { endGame(); return }
  const ns = [nh, ...snake.value]
  if (nh.x === food.x && nh.y === food.y) {
    score.value += 10
    if (score.value % 50 === 0) { level.value++; updateMoveInterval() }
    spawnFood()
  } else { ns.pop() }
  snake.value = ns
}

function togglePause() { if (state.value === 'playing') paused.value = !paused.value }
function goBack() { state.value = 'menu'; loadBest() }

function endGame() {
  state.value = 'gameover'; saveBest()
  if (gameLoopId) { cancelAnimationFrame(gameLoopId); gameLoopId = null }
}

function gameLoop(ts) {
  if (state.value === 'playing' && !paused.value && ts - lastMoveTime > moveInterval) { moveSnake(); lastMoveTime = ts }
  if (state.value !== 'menu') draw()
  gameLoopId = requestAnimationFrame(gameLoop)
}

// ===== 开始（关键修复：用 nextTick 等 DOM）=====
async function startGame() {
  if (state.value === 'gameover') { state.value = 'menu'; await nextTick() }
  state.value = 'playing'
  await nextTick() // ★ 等 Vue 渲染完 canvas-wrapper

  const canvas = canvasRef.value
  const wrapper = canvasWrapper.value
  if (wrapper) {
    const maxW = wrapper.clientWidth - 4
    const maxH = Math.min(window.innerHeight * 0.55, 600)
    CELL = Math.floor(Math.min(maxW / COLS, maxH / ROWS))
    CELL = Math.min(CELL, 32); CELL = Math.max(CELL, 18)
  }
  canvasWidth = COLS * CELL; canvasHeight = ROWS * CELL
  if (canvas) { canvas.width = canvasWidth; canvas.height = canvasHeight; canvas.style.width = canvasWidth + 'px'; canvas.style.height = canvasHeight + 'px' }

  ctx = canvas.getContext('2d')
  initSnake(); score.value = 0; level.value = 1; paused.value = false
  updateMoveInterval(); lastMoveTime = performance.now()
  spawnFood()
  if (gameLoopId) cancelAnimationFrame(gameLoopId)
  gameLoopId = requestAnimationFrame(gameLoop)
}

function onKeyDown(e) {
  if (state.value !== 'playing' || paused.value) return
  switch (e.key) {
    case 'ArrowUp': changeDir(0, -1); e.preventDefault(); break
    case 'ArrowDown': changeDir(0, 1); e.preventDefault(); break
    case 'ArrowLeft': changeDir(-1, 0); e.preventDefault(); break
    case 'ArrowRight': changeDir(1, 0); e.preventDefault(); break
    case 'p': case 'P': togglePause(); break
  }
}

onMounted(() => { loadBest(); gameLoopId = requestAnimationFrame(gameLoop); window.addEventListener('keydown', onKeyDown) })
onUnmounted(() => { if (gameLoopId) cancelAnimationFrame(gameLoopId); window.removeEventListener('keydown', onKeyDown) })
</script>

<style scoped>
.snake-root { width: 100%; }

/* ===== 菜单 ===== */
.menu-screen { display: flex; align-items: center; justify-content: center; min-height: 420px; }
.menu-card { background: #fff; border-radius: 16px; padding: 40px 36px; text-align: center; box-shadow: 0 4px 24px rgba(0,0,0,0.08); max-width: 400px; width: 100%; }
.menu-icon { font-size: 64px; margin-bottom: 8px; }
.menu-title { font-size: 26px; font-weight: 700; color: #303133; margin: 0 0 24px 0; }
.menu-section { margin-bottom: 20px; }
.menu-label { font-size: 14px; color: #909399; margin-bottom: 10px; }
.speed-row { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; }
.record-row { display: flex; gap: 32px; justify-content: center; }
.record-item { text-align: center; }
.record-num { display: block; font-size: 28px; font-weight: 700; color: #67c23a; }
.record-unit { font-size: 12px; color: #c0c4cc; }
.start-btn { margin: 8px 0 12px 0; width: 200px; font-size: 18px; }
.menu-hint { font-size: 12px; color: #c0c4cc; margin: 0; }

/* ===== 游戏 ===== */
.play-screen { display: flex; flex-direction: column; align-items: center; position: relative; }
.play-topbar { display: flex; align-items: center; gap: 20px; padding: 8px 16px; background: #fff; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); margin-bottom: 12px; flex-wrap: wrap; justify-content: center; }
.topbar-item { font-size: 15px; color: #606266; }
.topbar-item strong { color: #303133; }
.topbar-pause { margin-left: 8px; }
.canvas-wrapper { position: relative; border: 3px solid #67c23a; border-radius: 6px; overflow: hidden; line-height: 0; }
.play-canvas { display: block; }
.pause-overlay { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; }
.pause-card { text-align: center; color: #fff; }
.pause-card h3 { font-size: 24px; margin: 0 0 16px 0; }

.play-bottombar { margin-top: 12px; text-align: center; }
.touch-row { display: flex; justify-content: center; gap: 8px; margin-bottom: 6px; }
.ctrl-btn { width: 48px; height: 44px; border: none; border-radius: 10px; background: #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.1); font-size: 20px; cursor: pointer; user-select: none; touch-action: manipulation; }
.ctrl-btn:active { background: #e6ffe6; transform: scale(0.95); }

/* ===== 结束 ===== */
.over-screen { display: flex; align-items: center; justify-content: center; min-height: 420px; }
.over-card { background: #fff; border-radius: 16px; padding: 36px 32px; text-align: center; box-shadow: 0 4px 24px rgba(0,0,0,0.1); max-width: 380px; width: 100%; }
.over-icon { font-size: 48px; margin-bottom: 4px; }
.over-title { font-size: 24px; font-weight: 700; color: #303133; margin: 0 0 20px 0; }
.over-stats { margin-bottom: 20px; }
.stat-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f0f0f0; font-size: 15px; color: #606266; }
.stat-row strong { color: #303133; font-size: 17px; }
.new-record { color: #e6a23c; font-weight: 700; font-size: 16px; margin-top: 10px; }
.over-btns { display: flex; gap: 12px; justify-content: center; }

@media (max-width: 768px) { .menu-card { padding: 28px 20px; } }
</style>
