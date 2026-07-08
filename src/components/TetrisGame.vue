<template>
  <div class="tetris-container">
    <!-- 游戏画布区 -->
    <div class="game-area">
      <canvas ref="canvasRef" :width="canvasWidth" :height="canvasHeight"></canvas>

      <!-- 开始遮罩 -->
      <div v-if="!gameStarted && !gameOver" class="overlay">
        <div class="overlay-box">
          <h3>🧱 俄罗斯方块</h3>
          <el-button type="primary" @click="startGame" size="large">开始游戏</el-button>
          <p class="overlay-tips">← → 移动 &nbsp;|&nbsp; ↑ 旋转 &nbsp;|&nbsp; ↓ 加速 &nbsp;|&nbsp; 空格 落底</p>
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
        <div class="panel-label">下一个方块</div>
        <canvas ref="nextCanvasRef" :width="nextCanvasSize" :height="nextCanvasSize"></canvas>
      </div>
      <div class="panel-card">
        <div class="panel-label">得分</div>
        <div class="panel-value">{{ score }}</div>
      </div>
      <div class="panel-card">
        <div class="panel-label">等级</div>
        <div class="panel-value">{{ level }}</div>
      </div>
      <div class="panel-card">
        <div class="panel-label">消除行数</div>
        <div class="panel-value">{{ lines }}</div>
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
          <el-button class="touch-btn" @pointerdown.prevent="rotate" size="small">🔄</el-button>
        </div>
        <div class="touch-row">
          <el-button class="touch-btn" @pointerdown.prevent="move(-1,0)" size="small">◀</el-button>
          <el-button class="touch-btn" @pointerdown.prevent="move(0,1)" size="small">▼</el-button>
          <el-button class="touch-btn" @pointerdown.prevent="move(1,0)" size="small">▶</el-button>
        </div>
        <div class="touch-row">
          <el-button class="touch-btn touch-drop" @pointerdown.prevent="hardDrop" size="small">⏬ 落底</el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

// ---- DOM 引用 ----
const canvasRef = ref(null)
const nextCanvasRef = ref(null)

// ---- 画布尺寸 ----
const COLS = 10
const ROWS = 20
const CELL = 28
const canvasWidth = COLS * CELL
const canvasHeight = ROWS * CELL
const nextCanvasSize = 4 * CELL

// ---- 速度选项 ----
const speedOptions = [
  { label: '🐢 慢速', value: 0 },
  { label: '🐇 普通', value: 1 },
  { label: '🐎 快速', value: 2 },
  { label: '🚀 极速', value: 3 }
]
const speedLevel = ref(1) // 默认普通

// ---- 游戏状态 ----
const score = ref(0)
const level = ref(1)
const lines = ref(0)
const gameStarted = ref(false)
const gameOver = ref(false)
const paused = ref(false)

// ---- 方块定义 ----
const TETROMINOS = {
  I: { shapes: [[[0,0],[1,0],[2,0],[3,0]], [[0,0],[0,1],[0,2],[0,3]], [[0,0],[1,0],[2,0],[3,0]], [[0,0],[0,1],[0,2],[0,3]]], color: '#00bcd4' },
  O: { shapes: [[[0,0],[1,0],[0,1],[1,1]], [[0,0],[1,0],[0,1],[1,1]], [[0,0],[1,0],[0,1],[1,1]], [[0,0],[1,0],[0,1],[1,1]]], color: '#ffeb3b' },
  T: { shapes: [[[0,0],[1,0],[2,0],[1,1]], [[0,0],[0,1],[0,2],[1,1]], [[1,0],[0,1],[1,1],[2,1]], [[0,1],[1,0],[1,1],[1,2]]], color: '#9c27b0' },
  S: { shapes: [[[1,0],[2,0],[0,1],[1,1]], [[0,0],[0,1],[1,1],[1,2]], [[1,0],[2,0],[0,1],[1,1]], [[0,0],[0,1],[1,1],[1,2]]], color: '#4caf50' },
  Z: { shapes: [[[0,0],[1,0],[1,1],[2,1]], [[1,0],[0,1],[1,1],[0,2]], [[0,0],[1,0],[1,1],[2,1]], [[1,0],[0,1],[1,1],[0,2]]], color: '#f44336' },
  J: { shapes: [[[0,0],[0,1],[1,1],[2,1]], [[0,0],[1,0],[0,1],[0,2]], [[0,1],[1,1],[2,1],[2,0]], [[0,2],[0,1],[0,0],[1,2]]], color: '#2196f3' },
  L: { shapes: [[[2,0],[0,1],[1,1],[2,1]], [[0,0],[0,1],[0,2],[1,0]], [[0,1],[1,1],[2,1],[0,0]], [[0,2],[0,1],[0,0],[1,2]]], color: '#ff9800' }
}
const TETRO_NAMES = Object.keys(TETROMINOS)

// ---- 游戏内部变量 ----
let board = []
let currentPiece = null
let nextPieceName = ''
let gameLoopId = null
let baseDropInterval = 800  // 基础下落间隔
let dropInterval = 800
let lastDropTime = 0
let ctx = null
let nextCtx = null

// ---- 速度调节 ----
function setSpeed(val) {
  speedLevel.value = val
  updateDropInterval()
}

/** 根据速度等级和游戏等级计算下落间隔 */
function updateDropInterval() {
  // 速度乘数：慢=1.5, 普通=1, 快=0.5, 极速=0.25
  const multipliers = [1.5, 1.0, 0.5, 0.25]
  const factor = multipliers[speedLevel.value] || 1.0
  dropInterval = Math.max(40, Math.floor(baseDropInterval * factor - (level.value - 1) * 50))
}

// ---- 游戏逻辑 ----

function createBoard() {
  board = []
  for (let r = 0; r < ROWS; r++) board.push(new Array(COLS).fill(null))
}

function randomPiece() {
  return TETRO_NAMES[Math.floor(Math.random() * TETRO_NAMES.length)]
}

function getShape(name, rotation) {
  return TETROMINOS[name].shapes[rotation]
}

function collides(name, rotation, px, py) {
  const shape = getShape(name, rotation)
  for (const [dx, dy] of shape) {
    const x = px + dx, y = py + dy
    if (x < 0 || x >= COLS || y >= ROWS) return true
    if (y >= 0 && board[y][x] !== null) return true
  }
  return false
}

function lockPiece() {
  const { name, rotation, x, y } = currentPiece
  const shape = getShape(name, rotation)
  const color = TETROMINOS[name].color
  for (const [dx, dy] of shape) {
    const bx = x + dx, by = y + dy
    if (by < 0) continue
    board[by][bx] = color
  }
}

function clearLines() {
  let cleared = 0
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r].every(cell => cell !== null)) {
      board.splice(r, 1)
      board.unshift(new Array(COLS).fill(null))
      cleared++
      r++
    }
  }
  return cleared
}

function spawnPiece() {
  const name = nextPieceName || randomPiece()
  nextPieceName = randomPiece()
  currentPiece = { name, rotation: 0, x: Math.floor((COLS - 4) / 2), y: -1 }
  if (collides(name, 0, currentPiece.x, currentPiece.y)) {
    gameOver.value = true
    gameStarted.value = false
    if (gameLoopId) { cancelAnimationFrame(gameLoopId); gameLoopId = null }
  }
  drawNext()
}

function move(dx, dy) {
  if (!gameStarted.value || gameOver.value || paused.value) return false
  const { name, rotation, x, y } = currentPiece
  if (!collides(name, rotation, x + dx, y + dy)) {
    currentPiece.x += dx; currentPiece.y += dy
    return true
  }
  if (dy > 0) {
    lockPiece()
    const cleared = clearLines()
    if (cleared > 0) {
      lines.value += cleared
      const points = [0, 100, 300, 500, 800][cleared]
      score.value += points * level.value
      level.value = Math.floor(lines.value / 10) + 1
      updateDropInterval()
    }
    spawnPiece()
  }
  return false
}

function rotate() {
  if (!gameStarted.value || gameOver.value || paused.value) return
  const { name, rotation, x, y } = currentPiece
  const newRotation = (rotation + 1) % 4
  if (!collides(name, newRotation, x, y)) { currentPiece.rotation = newRotation; return }
  for (const offset of [-1, 1, -2, 2]) {
    if (!collides(name, newRotation, x + offset, y)) { currentPiece.x += offset; currentPiece.rotation = newRotation; return }
  }
}

function hardDrop() {
  if (!gameStarted.value || gameOver.value || paused.value) return
  let dropped = 0
  while (!collides(currentPiece.name, currentPiece.rotation, currentPiece.x, currentPiece.y + 1)) {
    currentPiece.y++; dropped++
  }
  score.value += dropped * 2
  lockPiece()
  const cleared = clearLines()
  if (cleared > 0) {
    lines.value += cleared
    const points = [0, 100, 300, 500, 800][cleared]
    score.value += points * level.value
    level.value = Math.floor(lines.value / 10) + 1
    updateDropInterval()
  }
  spawnPiece()
}

function togglePause() {
  if (!gameStarted.value || gameOver.value) return
  paused.value = !paused.value
}

// ---- 渲染 ----

function drawCell(ctx, col, row, color) {
  const x = col * CELL, y = row * CELL, inset = 1
  ctx.fillStyle = color
  ctx.fillRect(x + inset, y + inset, CELL - inset * 2, CELL - inset * 2)
  ctx.fillStyle = 'rgba(255,255,255,0.3)'
  ctx.fillRect(x + inset, y + inset, CELL - inset * 2, 3)
  ctx.fillRect(x + inset, y + inset, 3, CELL - inset * 2)
  ctx.fillStyle = 'rgba(0,0,0,0.3)'
  ctx.fillRect(x + inset, y + CELL - 3 - inset, CELL - inset * 2, 3)
  ctx.fillRect(x + CELL - 3 - inset, y + inset, 3, CELL - inset * 2)
}

function drawBoard() {
  if (!ctx) return
  ctx.fillStyle = '#1a1a2e'
  ctx.fillRect(0, 0, canvasWidth, canvasHeight)
  ctx.strokeStyle = '#2a2a4a'; ctx.lineWidth = 0.5
  for (let r = 0; r <= ROWS; r++) { ctx.beginPath(); ctx.moveTo(0, r * CELL); ctx.lineTo(COLS * CELL, r * CELL); ctx.stroke() }
  for (let c = 0; c <= COLS; c++) { ctx.beginPath(); ctx.moveTo(c * CELL, 0); ctx.lineTo(c * CELL, ROWS * CELL); ctx.stroke() }
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (board[r][c]) drawCell(ctx, c, r, board[r][c])
  if (currentPiece && !gameOver.value) {
    const { name, rotation, x, y } = currentPiece
    const shape = getShape(name, rotation), color = TETROMINOS[name].color
    for (const [dx, dy] of shape) { const px = x + dx, py = y + dy; if (py >= 0) drawCell(ctx, px, py, color) }
    let ghostY = y
    while (!collides(name, rotation, x, ghostY + 1)) ghostY++
    if (ghostY > y) {
      ctx.globalAlpha = 0.25
      for (const [dx, dy] of shape) { const px = x + dx, py = ghostY + dy; if (py >= 0) drawCell(ctx, px, py, color) }
      ctx.globalAlpha = 1
    }
  }
}

function drawNext() {
  if (!nextCtx) return
  nextCtx.fillStyle = '#1a1a2e'
  nextCtx.fillRect(0, 0, nextCanvasSize, nextCanvasSize)
  if (!nextPieceName) return
  const shape = TETROMINOS[nextPieceName].shapes[0]
  const color = TETROMINOS[nextPieceName].color
  const minX = Math.min(...shape.map(s => s[0])), maxX = Math.max(...shape.map(s => s[0]))
  const minY = Math.min(...shape.map(s => s[1])), maxY = Math.max(...shape.map(s => s[1]))
  const pw = maxX - minX + 1, ph = maxY - minY + 1
  const offsetX = Math.floor((4 - pw) / 2) - minX, offsetY = Math.floor((4 - ph) / 2) - minY
  for (const [dx, dy] of shape) drawCell(nextCtx, dx + offsetX, dy + offsetY, color)
}

// ---- 游戏循环 ----

function gameLoop(timestamp) {
  if (gameStarted.value && !gameOver.value && !paused.value) {
    if (timestamp - lastDropTime > dropInterval) { move(0, 1); lastDropTime = timestamp }
  }
  drawBoard()
  gameLoopId = requestAnimationFrame(gameLoop)
}

// ---- 开始 ----

function startGame() {
  createBoard()
  score.value = 0; level.value = 1; lines.value = 0
  gameOver.value = false; paused.value = false; gameStarted.value = true
  updateDropInterval(); lastDropTime = performance.now()
  nextPieceName = randomPiece()
  spawnPiece()
  if (gameLoopId) cancelAnimationFrame(gameLoopId)
  gameLoopId = requestAnimationFrame(gameLoop)
}

// ---- 键盘 ----

function onKeyDown(e) {
  if (!gameStarted.value || gameOver.value) return
  if (e.key === 'p' || e.key === 'P') { togglePause(); return }
  if (paused.value) return
  switch (e.key) {
    case 'ArrowLeft': move(-1, 0); e.preventDefault(); break
    case 'ArrowRight': move(1, 0); e.preventDefault(); break
    case 'ArrowDown': move(0, 1); e.preventDefault(); break
    case 'ArrowUp': rotate(); e.preventDefault(); break
    case ' ': hardDrop(); e.preventDefault(); break
  }
}

// ---- 生命周期 ----

onMounted(() => {
  ctx = canvasRef.value?.getContext('2d')
  nextCtx = nextCanvasRef.value?.getContext('2d')
  createBoard(); drawBoard(); drawNext()
  window.addEventListener('keydown', onKeyDown)
})

onUnmounted(() => {
  if (gameLoopId) cancelAnimationFrame(gameLoopId)
  window.removeEventListener('keydown', onKeyDown)
})
</script>

<style scoped>
.tetris-container {
  display: flex;
  gap: 20px;
  justify-content: center;
  align-items: flex-start;
  flex-wrap: wrap;
}

.game-area {
  position: relative;
  border: 2px solid #409eff;
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

.touch-drop {
  width: auto !important;
  padding: 0 12px !important;
  font-size: 13px !important;
}

/* 手机端适配 */
@media (max-width: 768px) {
  .tetris-container {
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
