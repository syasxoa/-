<template>
  <div class="tetris-root">
    <!-- ======== 状态一：开始菜单 ======== -->
    <div v-if="state === 'menu'" class="menu-screen">
      <div class="menu-card">
        <div class="menu-icon">🧱</div>
        <h2 class="menu-title">俄罗斯方块</h2>
        <div class="menu-section">
          <div class="menu-label">游戏速度</div>
          <div class="speed-row">
            <el-button v-for="opt in speedOptions" :key="opt.value" :type="speedLevel === opt.value ? 'primary' : ''" @click="speedLevel = opt.value" size="large">{{ opt.label }}</el-button>
          </div>
        </div>
        <div class="menu-section">
          <div class="menu-label">🏆 历史最佳</div>
          <div class="record-row">
            <div class="record-item"><span class="record-num">{{ bestScore }}</span><span class="record-unit">最高分</span></div>
            <div class="record-item"><span class="record-num">{{ bestLines }}</span><span class="record-unit">最多行</span></div>
          </div>
        </div>
        <el-button type="primary" size="large" class="start-btn" @click="startGame">🎮 开始游戏</el-button>
        <p class="menu-hint">💻 键盘：← → 移动 &nbsp; ↑ 旋转 &nbsp; ↓ 加速 &nbsp; 空格 落底 &nbsp; ESC 暂停</p>
        <p class="menu-hint mobile-only">📱 点击旋转 &nbsp; ← → 滑动移动 &nbsp; ↓ 滑落底 &nbsp; 长按加速</p>
      </div>
    </div>

    <!-- ======== 状态二：游戏中 ======== -->
    <div v-else-if="state === 'playing'" class="play-screen">
      <div class="canvas-wrapper" ref="canvasWrapper"
        @touchstart.prevent="onTouchStart"
        @touchend.prevent="onTouchEnd"
        @touchmove.prevent="onTouchMove"
        @touchcancel="onTouchCancel">
        <canvas ref="canvasRef" class="play-canvas"></canvas>
        <!-- 暂停按钮：阻止触摸事件冒泡到 canvas-wrapper，确保手机端可点击 -->
        <span class="pause-btn" v-if="!paused"
          @click="togglePause"
          @touchstart.stop
          @touchend.stop>暂停</span>
        <div v-if="paused" class="pause-overlay"
          @touchstart.stop
          @touchend.stop>
          <div class="pause-card">
            <h3>⏸ 已暂停</h3>
            <div class="pause-btns">
              <span class="pause-link" @click="togglePause" @touchstart.stop @touchend.stop>继续</span>
              <span class="pause-link" @click="restartGame" @touchstart.stop @touchend.stop>重新开始</span>
              <span class="pause-link" @click="goBack" @touchstart.stop @touchend.stop>返回</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ======== 状态三：游戏结束 ======== -->
    <div v-else-if="state === 'gameover'" class="over-screen">
      <div class="over-card">
        <div class="over-icon">{{ isNewRecord ? '🎉' : '😵' }}</div>
        <h2 class="over-title">游戏结束</h2>
        <div class="over-stats">
          <div class="stat-row"><span>最终得分</span><strong>{{ score }}</strong></div>
          <div class="stat-row"><span>消除行数</span><strong>{{ lines }}</strong></div>
          <div class="stat-row"><span>达到等级</span><strong>Lv.{{ level }}</strong></div>
          <div class="stat-row"><span>历史最佳</span><strong>{{ bestScore }}</strong></div>
          <div v-if="isNewRecord" class="new-record">🎊 新纪录！</div>
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

const COLS = 10, ROWS = 20
let CELL = 32, canvasWidth = 640, canvasHeight = 1120

const speedOptions = [
  { label: '🐢 慢速', value: 0 },
  { label: '🐇 普通', value: 1 },
  { label: '🐎 快速', value: 2 },
  { label: '🚀 极速', value: 3 }
]
const speedLevel = ref(1)
const score = ref(0), level = ref(1), lines = ref(0), paused = ref(false)
const bestScore = ref(0), bestLines = ref(0)
const isNewRecord = ref(false)

const TETROMINOS = {
  I: { shapes: [[[0,0],[1,0],[2,0],[3,0]],[[0,0],[0,1],[0,2],[0,3]],[[0,0],[1,0],[2,0],[3,0]],[[0,0],[0,1],[0,2],[0,3]]], color: '#00bcd4' },
  O: { shapes: [[[0,0],[1,0],[0,1],[1,1]],[[0,0],[1,0],[0,1],[1,1]],[[0,0],[1,0],[0,1],[1,1]],[[0,0],[1,0],[0,1],[1,1]]], color: '#ffeb3b' },
  T: { shapes: [[[0,0],[1,0],[2,0],[1,1]],[[0,0],[0,1],[0,2],[1,1]],[[1,0],[0,1],[1,1],[2,1]],[[0,1],[1,0],[1,1],[1,2]]], color: '#9c27b0' },
  S: { shapes: [[[1,0],[2,0],[0,1],[1,1]],[[0,0],[0,1],[1,1],[1,2]],[[1,0],[2,0],[0,1],[1,1]],[[0,0],[0,1],[1,1],[1,2]]], color: '#4caf50' },
  Z: { shapes: [[[0,0],[1,0],[1,1],[2,1]],[[1,0],[0,1],[1,1],[0,2]],[[0,0],[1,0],[1,1],[2,1]],[[1,0],[0,1],[1,1],[0,2]]], color: '#f44336' },
  J: { shapes: [[[0,0],[0,1],[1,1],[2,1]],[[0,0],[1,0],[0,1],[0,2]],[[0,0],[1,0],[2,0],[2,1]],[[1,0],[1,1],[1,2],[0,2]]], color: '#2196f3' },
  L: { shapes: [[[2,0],[0,1],[1,1],[2,1]],[[0,0],[1,0],[1,1],[1,2]],[[0,0],[1,0],[2,0],[0,1]],[[0,0],[0,1],[0,2],[1,2]]], color: '#ff9800' }
}
const TETRO_NAMES = Object.keys(TETROMINOS)

let board = [], currentPiece = null, nextPieceName = ''
let gameLoopId = null, dropInterval = 800, lastDropTime = 0, ctx = null

// ===== 触摸手势状态 =====
let touchStartX = 0, touchStartY = 0, touchStartTime = 0
let longPressTimer = null, softDropInterval = null
const SWIPE_THRESHOLD = 30
const LONG_PRESS_DELAY = 400 // 长按判定的时长（毫秒）

function loadBest() {
  try { const d = JSON.parse(localStorage.getItem('tetris_best') || '{}'); bestScore.value = d.score || 0; bestLines.value = d.lines || 0 } catch { bestScore.value = 0; bestLines.value = 0 }
}
function saveBest() {
  if (score.value > bestScore.value || lines.value > bestLines.value) {
    localStorage.setItem('tetris_best', JSON.stringify({ score: Math.max(score.value, bestScore.value), lines: Math.max(lines.value, bestLines.value) }))
  }
}

function createBoard() { board = Array.from({ length: ROWS }, () => new Array(COLS).fill(null)) }
function randomPiece() { return TETRO_NAMES[Math.floor(Math.random() * TETRO_NAMES.length)] }
function getShape(n, r) { return TETROMINOS[n].shapes[r] }

function collides(name, rot, px, py) {
  for (const [dx, dy] of getShape(name, rot)) {
    const x = px + dx, y = py + dy
    if (x < 0 || x >= COLS || y >= ROWS) return true
    if (y >= 0 && board[y][x] !== null) return true
  }
  return false
}

function updateDropInterval() {
  const m = [1.5, 1.0, 0.5, 0.25]; dropInterval = Math.max(40, Math.floor(800 * (m[speedLevel.value] || 1) - (level.value - 1) * 50))
}

function lockPiece() {
  for (const [dx, dy] of getShape(currentPiece.name, currentPiece.rotation)) {
    const bx = currentPiece.x + dx, by = currentPiece.y + dy
    if (by < 0) continue; board[by][bx] = TETROMINOS[currentPiece.name].color
  }
}

function clearLines() {
  let c = 0
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r].every(cell => cell !== null)) { board.splice(r, 1); board.unshift(new Array(COLS).fill(null)); c++; r++ }
  }
  return c
}

function spawnPiece() {
  const name = nextPieceName || randomPiece(); nextPieceName = randomPiece()
  currentPiece = { name, rotation: 0, x: Math.floor((COLS - 4) / 2), y: -1 }
  if (collides(name, 0, currentPiece.x, currentPiece.y)) { endGame() }
}

function move(dx, dy) {
  if (state.value !== 'playing' || paused.value) return false
  const { name, rotation, x, y } = currentPiece
  if (!collides(name, rotation, x + dx, y + dy)) { currentPiece.x += dx; currentPiece.y += dy; return true }
  if (dy > 0) {
    lockPiece()
    const c = clearLines()
    if (c > 0) { lines.value += c; score.value += [0, 100, 300, 500, 800][c] * level.value; level.value = Math.floor(lines.value / 10) + 1; updateDropInterval() }
    spawnPiece()
  }
  return false
}

function rotate() {
  if (state.value !== 'playing' || paused.value) return
  const { name, rotation, x, y } = currentPiece; const nr = (rotation + 1) % 4
  if (!collides(name, nr, x, y)) { currentPiece.rotation = nr; return }
  for (const o of [-1, 1, -2, 2]) { if (!collides(name, nr, x + o, y)) { currentPiece.x += o; currentPiece.rotation = nr; return } }
}

function hardDrop() {
  if (state.value !== 'playing' || paused.value) return
  let d = 0
  while (!collides(currentPiece.name, currentPiece.rotation, currentPiece.x, currentPiece.y + 1)) { currentPiece.y++; d++ }
  score.value += d * 2; lockPiece()
  const c = clearLines()
  if (c > 0) { lines.value += c; score.value += [0, 100, 300, 500, 800][c] * level.value; level.value = Math.floor(lines.value / 10) + 1; updateDropInterval() }
  spawnPiece()
}

function togglePause() { if (state.value === 'playing') paused.value = !paused.value }

function goBack() {
  state.value = 'menu'
  if (gameLoopId) { cancelAnimationFrame(gameLoopId); gameLoopId = null }
  ctx = null
  loadBest()
}

function endGame() {
  isNewRecord.value = score.value > bestScore.value
  state.value = 'gameover'
  saveBest()
  loadBest()
  if (gameLoopId) { cancelAnimationFrame(gameLoopId); gameLoopId = null }
}

function restartGame() {
  createBoard()
  score.value = 0; level.value = 1; lines.value = 0; paused.value = false
  updateDropInterval(); lastDropTime = performance.now()
  nextPieceName = randomPiece(); spawnPiece()
}

// ===== 触摸手势（优化版：下滑落底 + 长按加速）=====
function isPauseTarget(el) {
  // 判断触摸目标是否为暂停相关按钮（暂停/继续/重新开始/返回）
  if (!el) return false
  if (el.classList.contains('pause-btn') || el.classList.contains('pause-link') || el.closest('.pause-overlay')) return true
  return false
}

function onTouchStart(e) {
  if (isPauseTarget(e.target)) return // 触摸的是暂停按钮，不处理手势
  const t = e.touches[0]
  touchStartX = t.clientX; touchStartY = t.clientY
  touchStartTime = Date.now()

  // 清除之前的长按/软降定时器
  clearLongPress()

  // 设置长按检测：超过 LONG_PRESS_DELAY 毫秒后开始连续软降（加速下落）
  longPressTimer = setTimeout(() => {
    if (state.value !== 'playing' || paused.value) return
    // 启动连续软降
    softDropInterval = setInterval(() => {
      if (state.value !== 'playing' || paused.value) { clearSoftDrop(); return }
      move(0, 1)
    }, 50) // 每50ms下落一格，比正常速度快很多
  }, LONG_PRESS_DELAY)
}

function onTouchMove(e) {
  // 触摸移动时取消长按判定（滑动操作不走长按逻辑）
  if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null }
}

function onTouchEnd(e) {
  clearLongPress() // 手指离开，停止长按/软降

  if (state.value !== 'playing' || paused.value) return
  if (isPauseTarget(e.target)) return

  const t = e.changedTouches[0]
  const dx = t.clientX - touchStartX, dy = t.clientY - touchStartY
  const adx = Math.abs(dx), ady = Math.abs(dy)
  const duration = Date.now() - touchStartTime

  // 判断手势类型
  if (adx < SWIPE_THRESHOLD && ady < SWIPE_THRESHOLD) {
    // 短距离 + 短时间 = 点击 → 旋转方块
    if (duration < LONG_PRESS_DELAY) rotate()
  } else if (ady > adx) {
    // 纵向滑动为主
    if (dy > SWIPE_THRESHOLD) {
      // 下滑 → 一键落底（hardDrop）
      hardDrop()
    }
    // 上滑保持不处理（原来是旋转，点击已负责旋转）
  } else {
    // 横向滑动 → 左右移动
    if (adx > SWIPE_THRESHOLD) {
      move(dx > 0 ? 1 : -1, 0)
    }
  }
}

function onTouchCancel() {
  clearLongPress()
}

function clearLongPress() {
  if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null }
  clearSoftDrop()
}

function clearSoftDrop() {
  if (softDropInterval) { clearInterval(softDropInterval); softDropInterval = null }
}

// ===== 渲染 =====
function drawCell(cx, col, row, color) {
  const x = col * CELL, y = row * CELL, ins = 1
  cx.fillStyle = color; cx.fillRect(x + ins, y + ins, CELL - ins * 2, CELL - ins * 2)
  cx.fillStyle = 'rgba(255,255,255,0.3)'; cx.fillRect(x + ins, y + ins, CELL - ins * 2, 2); cx.fillRect(x + ins, y + ins, 2, CELL - ins * 2)
  cx.fillStyle = 'rgba(0,0,0,0.3)'; cx.fillRect(x + ins, y + CELL - 2 - ins, CELL - ins * 2, 2); cx.fillRect(x + CELL - 2 - ins, y + ins, 2, CELL - ins * 2)
}

function drawBoard() {
  if (!ctx) return
  ctx.fillStyle = '#1a1a2e'; ctx.fillRect(0, 0, canvasWidth, canvasHeight)
  ctx.strokeStyle = '#2a2a4a'; ctx.lineWidth = 0.5
  for (let r = 0; r <= ROWS; r++) { ctx.beginPath(); ctx.moveTo(0, r * CELL); ctx.lineTo(COLS * CELL, r * CELL); ctx.stroke() }
  for (let c = 0; c <= COLS; c++) { ctx.beginPath(); ctx.moveTo(c * CELL, 0); ctx.lineTo(c * CELL, ROWS * CELL); ctx.stroke() }
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (board[r][c]) drawCell(ctx, c, r, board[r][c])
  if (currentPiece && state.value === 'playing') {
    const { name, rotation, x, y } = currentPiece
    const shape = getShape(name, rotation), color = TETROMINOS[name].color
    for (const [dx, dy] of shape) { const px = x + dx, py = y + dy; if (py >= 0) drawCell(ctx, px, py, color) }
    let gy = y; while (!collides(name, rotation, x, gy + 1)) gy++
    if (gy > y) { ctx.globalAlpha = 0.25; for (const [dx, dy] of shape) { const px = x + dx, py = gy + dy; if (py >= 0) drawCell(ctx, px, py, color) } ctx.globalAlpha = 1 }
  }
}

// ★ 游戏循环
function startLoop() {
  function step(ts) {
    if (state.value !== 'menu') {
      if (state.value === 'playing' && !paused.value && ts - lastDropTime > dropInterval) { move(0, 1); lastDropTime = ts }
      drawBoard()
    }
    if (state.value !== 'menu') gameLoopId = requestAnimationFrame(step)
  }
  gameLoopId = requestAnimationFrame(step)
}

// ===== 开始 =====
async function startGame() {
  if (state.value === 'gameover') { state.value = 'menu'; await nextTick() }
  if (gameLoopId) { cancelAnimationFrame(gameLoopId); gameLoopId = null }
  state.value = 'playing'
  await nextTick()

  const canvas = canvasRef.value
  const wrapper = canvasWrapper.value
  if (wrapper) {
    const maxW = wrapper.clientWidth - 4
    const maxH = Math.min(window.innerHeight * 0.55, 700)
    CELL = Math.floor(Math.min(maxW / COLS, maxH / ROWS))
    CELL = Math.min(CELL, 36); CELL = Math.max(CELL, 22)
  }
  canvasWidth = COLS * CELL; canvasHeight = ROWS * CELL
  if (canvas) { canvas.width = canvasWidth; canvas.height = canvasHeight; canvas.style.width = canvasWidth + 'px'; canvas.style.height = canvasHeight + 'px' }

  ctx = canvas.getContext('2d')
  createBoard()
  score.value = 0; level.value = 1; lines.value = 0; paused.value = false
  clearLongPress() // 清理可能残留的长按状态
  updateDropInterval(); lastDropTime = performance.now()
  nextPieceName = randomPiece(); spawnPiece()
  startLoop()
}

// ===== 键盘 =====
function onKeyDown(e) {
  if (state.value !== 'playing') return
  if (e.key === 'Escape') { togglePause(); e.preventDefault(); return }
  if (paused.value) return
  switch (e.key) {
    case 'ArrowLeft': move(-1, 0); e.preventDefault(); break
    case 'ArrowRight': move(1, 0); e.preventDefault(); break
    case 'ArrowDown': move(0, 1); e.preventDefault(); break
    case 'ArrowUp': rotate(); e.preventDefault(); break
    case ' ': hardDrop(); e.preventDefault(); break
  }
}

onMounted(() => { loadBest(); window.addEventListener('keydown', onKeyDown) })
onUnmounted(() => { clearLongPress(); if (gameLoopId) cancelAnimationFrame(gameLoopId); window.removeEventListener('keydown', onKeyDown) })
</script>

<style scoped>
.tetris-root { width: 100%; }

.menu-screen { display: flex; align-items: center; justify-content: center; min-height: 420px; }
.menu-card { background: #fff; border-radius: 16px; padding: 40px 36px; text-align: center; box-shadow: 0 4px 24px rgba(0,0,0,0.08); max-width: 400px; width: 100%; }
.menu-icon { font-size: 64px; margin-bottom: 8px; }
.menu-title { font-size: 26px; font-weight: 700; color: #303133; margin: 0 0 24px 0; }
.menu-section { margin-bottom: 20px; }
.menu-label { font-size: 14px; color: #909399; margin-bottom: 10px; }
.speed-row { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; }
.record-row { display: flex; gap: 32px; justify-content: center; }
.record-item { text-align: center; }
.record-num { display: block; font-size: 28px; font-weight: 700; color: #409eff; }
.record-unit { font-size: 12px; color: #c0c4cc; }
.start-btn { margin: 8px 0 12px 0; width: 200px; font-size: 18px; }
.menu-hint { font-size: 12px; color: #c0c4cc; margin: 4px 0 0 0; }
/* 电脑端隐藏手机提示，手机端显示 */
.mobile-only { display: none; }

.play-screen { display: flex; flex-direction: column; align-items: center; }
.canvas-wrapper { position: relative; border: 3px solid #409eff; border-radius: 6px; overflow: hidden; line-height: 0; touch-action: none; }
.pause-btn { position: absolute; top: 6px; right: 10px; font-size: 14px; font-weight: 700; color: rgba(255,255,255,0.7); cursor: pointer; z-index: 4; user-select: none; padding: 6px 10px; border-radius: 3px; transition: color 0.15s, background 0.15s; }
.pause-btn:hover, .pause-btn:active { color: #fff; background: rgba(255,255,255,0.15); }
.play-canvas { display: block; }
.pause-overlay { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 5; }
.pause-card { text-align: center; color: #fff; }
.pause-card h3 { font-size: 24px; margin: 0 0 36px 0; }
.pause-btns { display: flex; flex-direction: column; gap: 14px; align-items: center; }
.pause-link { font-size: 18px; font-weight: 400; color: rgba(255,255,255,0.6); cursor: pointer; user-select: none; padding: 8px 16px; border-radius: 4px; transition: color 0.15s, background 0.15s; }
.pause-link:hover, .pause-link:active { color: #fff; background: rgba(255,255,255,0.12); }

.over-screen { display: flex; align-items: center; justify-content: center; min-height: 420px; }
.over-card { background: #fff; border-radius: 16px; padding: 36px 32px; text-align: center; box-shadow: 0 4px 24px rgba(0,0,0,0.1); max-width: 380px; width: 100%; }
.over-icon { font-size: 48px; margin-bottom: 4px; }
.over-title { font-size: 24px; font-weight: 700; color: #303133; margin: 0 0 20px 0; }
.over-stats { margin-bottom: 20px; }
.stat-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f0f0f0; font-size: 15px; color: #606266; }
.stat-row strong { color: #303133; font-size: 17px; }
.new-record { color: #e6a23c; font-weight: 700; font-size: 16px; margin-top: 10px; }
.over-btns { display: flex; gap: 12px; justify-content: center; }

@media (max-width: 768px) {
  .menu-card { padding: 28px 20px; }
  .menu-hint:not(.mobile-only) { display: none; }
  .mobile-only { display: block; }
  .pause-btn { padding: 8px 14px; font-size: 16px; }
  .pause-link { padding: 10px 20px; font-size: 20px; }
}
</style>
