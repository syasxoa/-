<template>
  <div class="tetris-root">
    <!-- ======== 状态一：开始菜单 ======== -->
    <div v-if="state === 'menu'" class="menu-screen">
      <div class="menu-card">
        <div class="menu-icon">🧱</div>
        <h2 class="menu-title">俄罗斯方块</h2>

        <!-- 速度选择 -->
        <div class="menu-section">
          <div class="menu-label">游戏速度</div>
          <div class="speed-row">
            <el-button
              v-for="opt in speedOptions" :key="opt.value"
              :type="speedLevel === opt.value ? 'primary' : ''"
              @click="speedLevel = opt.value"
              size="large"
            >{{ opt.label }}</el-button>
          </div>
        </div>

        <!-- 历史最佳 -->
        <div class="menu-section">
          <div class="menu-label">🏆 历史最佳</div>
          <div class="record-row">
            <div class="record-item">
              <span class="record-num">{{ bestScore }}</span>
              <span class="record-unit">最高分</span>
            </div>
            <div class="record-item">
              <span class="record-num">{{ bestLines }}</span>
              <span class="record-unit">最多行</span>
            </div>
          </div>
        </div>

        <el-button type="primary" size="large" class="start-btn" @click="startGame">
          🎮 开始游戏
        </el-button>
        <p class="menu-hint">← → 移动 &nbsp; ↑ 旋转 &nbsp; ↓ 加速 &nbsp; 空格 落底</p>
      </div>
    </div>

    <!-- ======== 状态二：游戏中 ======== -->
    <div v-else class="play-screen">
      <!-- 顶栏：得分 + 等级 + 暂停 -->
      <div class="play-topbar">
        <span class="topbar-item">⭐ <strong>{{ score }}</strong></span>
        <span class="topbar-item">📊 Lv.<strong>{{ level }}</strong></span>
        <span class="topbar-item">⚡ {{ speedOptions[speedLevel].label }}</span>
        <span class="topbar-item">📏 {{ lines }}行</span>
        <el-button size="small" @click="togglePause" class="topbar-pause">⏯ 暂停</el-button>
      </div>

      <!-- 大画布 -->
      <div class="canvas-wrapper" ref="canvasWrapper">
        <canvas ref="canvasRef" class="play-canvas"></canvas>

        <!-- 暂停遮罩 -->
        <div v-if="paused" class="pause-overlay">
          <div class="pause-card">
            <h3>⏸ 已暂停</h3>
            <el-button type="primary" size="large" @click="togglePause">继续游戏</el-button>
          </div>
        </div>
      </div>

      <!-- 底栏：触屏按钮 -->
      <div class="play-bottombar">
        <div class="touch-row">
          <button class="ctrl-btn" @pointerdown.prevent="rotate">🔄</button>
        </div>
        <div class="touch-row">
          <button class="ctrl-btn" @pointerdown.prevent="move(-1,0)">◀</button>
          <button class="ctrl-btn" @pointerdown.prevent="move(0,1)">▼</button>
          <button class="ctrl-btn" @pointerdown.prevent="move(1,0)">▶</button>
        </div>
        <div class="touch-row">
          <button class="ctrl-btn ctrl-wide" @pointerdown.prevent="hardDrop">⏬ 落底</button>
        </div>
      </div>

      <!-- 预览小窗 -->
      <div class="preview-mini">
        <div class="preview-label">下一个</div>
        <canvas ref="nextCanvasRef" class="preview-canvas"></canvas>
      </div>
    </div>

    <!-- ======== 状态三：游戏结束 ======== -->
    <div v-if="state === 'gameover'" class="over-screen">
      <div class="over-card">
        <div class="over-icon">{{ score > bestScore ? '🎉' : '😵' }}</div>
        <h2 class="over-title">游戏结束</h2>

        <div class="over-stats">
          <div class="stat-row"><span>最终得分</span><strong>{{ score }}</strong></div>
          <div class="stat-row"><span>消除行数</span><strong>{{ lines }}</strong></div>
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
import { ref, onMounted, onUnmounted } from 'vue'

// ---- 状态机 ----
const state = ref('menu') // 'menu' | 'playing' | 'gameover'

// ---- DOM 引用 ----
const canvasRef = ref(null)
const nextCanvasRef = ref(null)
const canvasWrapper = ref(null)

// ---- 画布参数 ----
const COLS = 10, ROWS = 20
let CELL = 32 // 默认，进入游戏时动态计算
let canvasWidth = COLS * CELL
let canvasHeight = ROWS * CELL
const nextSize = 120 // 预览区固定

// ---- 速度选项 ----
const speedOptions = [
  { label: '🐢 慢速', value: 0 },
  { label: '🐇 普通', value: 1 },
  { label: '🐎 快速', value: 2 },
  { label: '🚀 极速', value: 3 }
]
const speedLevel = ref(1)

// ---- 游戏状态 ----
const score = ref(0), level = ref(1), lines = ref(0)
const paused = ref(false)

// ---- 历史最佳 ----
const bestScore = ref(0)
const bestLines = ref(0)

// ---- 方块定义 ----
const TETROMINOS = {
  I: { shapes: [[[0,0],[1,0],[2,0],[3,0]],[[0,0],[0,1],[0,2],[0,3]],[[0,0],[1,0],[2,0],[3,0]],[[0,0],[0,1],[0,2],[0,3]]], color: '#00bcd4' },
  O: { shapes: [[[0,0],[1,0],[0,1],[1,1]],[[0,0],[1,0],[0,1],[1,1]],[[0,0],[1,0],[0,1],[1,1]],[[0,0],[1,0],[0,1],[1,1]]], color: '#ffeb3b' },
  T: { shapes: [[[0,0],[1,0],[2,0],[1,1]],[[0,0],[0,1],[0,2],[1,1]],[[1,0],[0,1],[1,1],[2,1]],[[0,1],[1,0],[1,1],[1,2]]], color: '#9c27b0' },
  S: { shapes: [[[1,0],[2,0],[0,1],[1,1]],[[0,0],[0,1],[1,1],[1,2]],[[1,0],[2,0],[0,1],[1,1]],[[0,0],[0,1],[1,1],[1,2]]], color: '#4caf50' },
  Z: { shapes: [[[0,0],[1,0],[1,1],[2,1]],[[1,0],[0,1],[1,1],[0,2]],[[0,0],[1,0],[1,1],[2,1]],[[1,0],[0,1],[1,1],[0,2]]], color: '#f44336' },
  J: { shapes: [[[0,0],[0,1],[1,1],[2,1]],[[0,0],[1,0],[0,1],[0,2]],[[0,1],[1,1],[2,1],[2,0]],[[0,2],[0,1],[0,0],[1,2]]], color: '#2196f3' },
  L: { shapes: [[[2,0],[0,1],[1,1],[2,1]],[[0,0],[0,1],[0,2],[1,0]],[[0,1],[1,1],[2,1],[0,0]],[[0,2],[0,1],[0,0],[1,2]]], color: '#ff9800' }
}
const TETRO_NAMES = Object.keys(TETROMINOS)

// ---- 内部变量 ----
let board = [], currentPiece = null, nextPieceName = ''
let gameLoopId = null, dropInterval = 800, lastDropTime = 0
let ctx = null, nextCtx = null

// ---- 历史记录 ----
function loadBest() {
  try {
    const d = JSON.parse(localStorage.getItem('tetris_best') || '{}')
    bestScore.value = d.score || 0
    bestLines.value = d.lines || 0
  } catch { bestScore.value = 0; bestLines.value = 0 }
}
function saveBest() {
  if (score.value > bestScore.value || lines.value > bestLines.value) {
    const d = { score: Math.max(score.value, bestScore.value), lines: Math.max(lines.value, bestLines.value) }
    localStorage.setItem('tetris_best', JSON.stringify(d))
    loadBest()
  }
}

// ---- 游戏逻辑 ----
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
  if (collides(name, 0, currentPiece.x, currentPiece.y)) { endGame(); return }
  drawPreview()
}

function move(dx, dy) {
  if (state.value !== 'playing' || paused.value) return false
  const { name, rotation, x, y } = currentPiece
  if (!collides(name, rotation, x + dx, y + dy)) { currentPiece.x += dx; currentPiece.y += dy; return true }
  if (dy > 0) {
    lockPiece()
    const c = clearLines()
    if (c > 0) {
      lines.value += c
      score.value += [0, 100, 300, 500, 800][c] * level.value
      level.value = Math.floor(lines.value / 10) + 1; updateDropInterval()
    }
    spawnPiece()
  }
  return false
}

function rotate() {
  if (state.value !== 'playing' || paused.value) return
  const { name, rotation, x, y } = currentPiece
  const nr = (rotation + 1) % 4
  if (!collides(name, nr, x, y)) { currentPiece.rotation = nr; return }
  for (const o of [-1, 1, -2, 2]) { if (!collides(name, nr, x + o, y)) { currentPiece.x += o; currentPiece.rotation = nr; return } }
}

function hardDrop() {
  if (state.value !== 'playing' || paused.value) return
  let d = 0
  while (!collides(currentPiece.name, currentPiece.rotation, currentPiece.x, currentPiece.y + 1)) { currentPiece.y++; d++ }
  score.value += d * 2
  lockPiece()
  const c = clearLines()
  if (c > 0) { lines.value += c; score.value += [0, 100, 300, 500, 800][c] * level.value; level.value = Math.floor(lines.value / 10) + 1; updateDropInterval() }
  spawnPiece()
}

function togglePause() { if (state.value === 'playing') paused.value = !paused.value }
function goBack() { state.value = 'menu'; loadBest() }

function endGame() {
  state.value = 'gameover'; saveBest()
  if (gameLoopId) { cancelAnimationFrame(gameLoopId); gameLoopId = null }
}

// ---- 渲染 ----
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
  if (currentPiece && state.value !== 'gameover') {
    const { name, rotation, x, y } = currentPiece
    const shape = getShape(name, rotation), color = TETROMINOS[name].color
    for (const [dx, dy] of shape) { const px = x + dx, py = y + dy; if (py >= 0) drawCell(ctx, px, py, color) }
    let gy = y; while (!collides(name, rotation, x, gy + 1)) gy++
    if (gy > y) { ctx.globalAlpha = 0.25; for (const [dx, dy] of shape) { const px = x + dx, py = gy + dy; if (py >= 0) drawCell(ctx, px, py, color) } ctx.globalAlpha = 1 }
  }
}

function drawPreview() {
  if (!nextCtx) return
  nextCtx.fillStyle = '#1a1a2e'; nextCtx.fillRect(0, 0, nextSize, nextSize)
  if (!nextPieceName) return
  const shape = TETROMINOS[nextPieceName].shapes[0], color = TETROMINOS[nextPieceName].color
  const s = 24; const minX = Math.min(...shape.map(p => p[0])), maxX = Math.max(...shape.map(p => p[0]))
  const minY = Math.min(...shape.map(p => p[1])), maxY = Math.max(...shape.map(p => p[1]))
  const pw = maxX - minX + 1, ph = maxY - minY + 1
  const ox = Math.floor((5 - pw) / 2) - minX, oy = Math.floor((5 - ph) / 2) - minY
  for (const [dx, dy] of shape) {
    const x = (dx + ox) * s, y = (dy + oy) * s
    nextCtx.fillStyle = color; nextCtx.fillRect(x + 1, y + 1, s - 2, s - 2)
  }
}

// ---- 游戏循环 ----
function gameLoop(ts) {
  if (state.value === 'playing' && !paused.value && ts - lastDropTime > dropInterval) { move(0, 1); lastDropTime = ts }
  if (state.value !== 'menu') drawBoard()
  gameLoopId = requestAnimationFrame(gameLoop)
}

// ---- 开始 ----
function startGame() {
  // 动态计算格子尺寸，让画布尽量大
  const wrapper = canvasWrapper.value
  if (wrapper) {
    const maxW = wrapper.clientWidth - 4
    const maxH = Math.min(window.innerHeight * 0.55, 700)
    CELL = Math.floor(Math.min(maxW / COLS, maxH / ROWS))
    CELL = Math.min(CELL, 36); CELL = Math.max(CELL, 22)
  }
  canvasWidth = COLS * CELL; canvasHeight = ROWS * CELL

  const canvas = canvasRef.value
  if (canvas) { canvas.width = canvasWidth; canvas.height = canvasHeight; canvas.style.width = canvasWidth + 'px'; canvas.style.height = canvasHeight + 'px' }

  createBoard()
  score.value = 0; level.value = 1; lines.value = 0; paused.value = false
  state.value = 'playing'; updateDropInterval(); lastDropTime = performance.now()
  nextPieceName = randomPiece(); spawnPiece()
  if (gameLoopId) cancelAnimationFrame(gameLoopId)
  gameLoopId = requestAnimationFrame(gameLoop)
}

// ---- 键盘 ----
function onKeyDown(e) {
  if (state.value !== 'playing' || paused.value) return
  switch (e.key) {
    case 'ArrowLeft': move(-1, 0); e.preventDefault(); break
    case 'ArrowRight': move(1, 0); e.preventDefault(); break
    case 'ArrowDown': move(0, 1); e.preventDefault(); break
    case 'ArrowUp': rotate(); e.preventDefault(); break
    case ' ': hardDrop(); e.preventDefault(); break
    case 'p': case 'P': togglePause(); break
  }
}

// ---- 生命周期 ----
onMounted(() => {
  loadBest()
  ctx = canvasRef.value?.getContext('2d')
  nextCtx = nextCanvasRef.value?.getContext('2d')
  createBoard(); drawBoard(); drawPreview()
  gameLoopId = requestAnimationFrame(gameLoop)
  window.addEventListener('keydown', onKeyDown)
})
onUnmounted(() => { if (gameLoopId) cancelAnimationFrame(gameLoopId); window.removeEventListener('keydown', onKeyDown) })
</script>

<style scoped>
/* ===== 通用根容器 ===== */
.tetris-root { width: 100%; }

/* ===== 菜单屏 ===== */
.menu-screen {
  display: flex; align-items: center; justify-content: center; min-height: 400px;
}
.menu-card {
  background: #fff; border-radius: 16px; padding: 40px 36px; text-align: center;
  box-shadow: 0 4px 24px rgba(0,0,0,0.08); max-width: 400px; width: 100%;
}
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
.menu-hint { font-size: 12px; color: #c0c4cc; margin: 0; }

/* ===== 游戏屏 ===== */
.play-screen {
  position: relative; display: flex; flex-direction: column; align-items: center;
}
.play-topbar {
  display: flex; align-items: center; gap: 20px; padding: 8px 16px;
  background: #fff; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  margin-bottom: 12px; flex-wrap: wrap; justify-content: center;
}
.topbar-item { font-size: 15px; color: #606266; }
.topbar-item strong { color: #303133; }
.topbar-pause { margin-left: 8px; }
.canvas-wrapper {
  position: relative; border: 3px solid #409eff; border-radius: 6px;
  overflow: hidden; line-height: 0;
}
.play-canvas { display: block; }
.pause-overlay {
  position: absolute; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center;
}
.pause-card { text-align: center; color: #fff; }
.pause-card h3 { font-size: 24px; margin: 0 0 16px 0; }

/* 预览小窗 */
.preview-mini {
  position: absolute; right: 50%; margin-right: -235px; top: 60px;
  background: #1a1a2e; border: 2px solid #409eff; border-radius: 6px;
  padding: 6px; z-index: 5;
}
.preview-label { font-size: 10px; color: #909399; text-align: center; margin-bottom: 2px; }
.preview-canvas { display: block; }

/* 底栏触屏 */
.play-bottombar { margin-top: 12px; text-align: center; }
.touch-row { display: flex; justify-content: center; gap: 8px; margin-bottom: 6px; }
.ctrl-btn {
  width: 48px; height: 44px; border: none; border-radius: 10px;
  background: #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  font-size: 20px; cursor: pointer; user-select: none; touch-action: manipulation;
}
.ctrl-btn:active { background: #e6f0ff; transform: scale(0.95); }
.ctrl-wide { width: auto; padding: 0 16px; font-size: 14px; }

/* ===== 结束屏 ===== */
.over-screen {
  display: flex; align-items: center; justify-content: center; min-height: 400px;
}
.over-card {
  background: #fff; border-radius: 16px; padding: 36px 32px; text-align: center;
  box-shadow: 0 4px 24px rgba(0,0,0,0.1); max-width: 380px; width: 100%;
}
.over-icon { font-size: 48px; margin-bottom: 4px; }
.over-title { font-size: 24px; font-weight: 700; color: #303133; margin: 0 0 20px 0; }
.over-stats { margin-bottom: 20px; }
.stat-row {
  display: flex; justify-content: space-between; padding: 8px 0;
  border-bottom: 1px solid #f0f0f0; font-size: 15px; color: #606266;
}
.stat-row strong { color: #303133; font-size: 17px; }
.new-record { color: #e6a23c; font-weight: 700; font-size: 16px; margin-top: 10px; }
.over-btns { display: flex; gap: 12px; justify-content: center; }

/* 手机适配 */
@media (max-width: 768px) {
  .menu-card { padding: 28px 20px; }
  .preview-mini { right: 10px; margin-right: 0; }
}
</style>
