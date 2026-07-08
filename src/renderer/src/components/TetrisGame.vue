<template>
  <div class="tetris-container">
    <!-- 游戏画布区 -->
    <div class="game-area">
      <canvas ref="canvasRef" :width="canvasWidth" :height="canvasHeight"></canvas>

      <!-- 游戏结束遮罩 -->
      <div v-if="gameOver" class="game-over-overlay">
        <div class="game-over-box">
          <h3>游戏结束</h3>
          <p>得分：<strong>{{ score }}</strong></p>
          <el-button type="primary" @click="startGame">再来一局</el-button>
        </div>
      </div>

      <!-- 暂停遮罩 -->
      <div v-if="paused && !gameOver" class="pause-overlay">
        <div class="pause-box">
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
        <p>← → 左右移动</p>
        <p>↓ 加速下落</p>
        <p>↑ 旋转方块</p>
        <p>空格 直接落底</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'

// ---- DOM 引用 ----
const canvasRef = ref(null)
const nextCanvasRef = ref(null)

// ---- 画布尺寸 ----
const COLS = 10          // 列数
const ROWS = 20          // 行数
const CELL = 28           // 每格像素
const canvasWidth = COLS * CELL
const canvasHeight = ROWS * CELL
const nextCanvasSize = 4 * CELL

// ---- 游戏状态 ----
const score = ref(0)
const level = ref(1)
const lines = ref(0)
const gameStarted = ref(false)
const gameOver = ref(false)
const paused = ref(false)

// ---- 方块定义（7种标准俄罗斯方块）----
// 每种方块存储旋转状态（0/90/180/270度），用坐标数组表示
const TETROMINOS = {
  I: {
    shapes: [
      [[0,0],[1,0],[2,0],[3,0]],
      [[0,0],[0,1],[0,2],[0,3]],
      [[0,0],[1,0],[2,0],[3,0]],
      [[0,0],[0,1],[0,2],[0,3]]
    ],
    color: '#00bcd4'
  },
  O: {
    shapes: [
      [[0,0],[1,0],[0,1],[1,1]],
      [[0,0],[1,0],[0,1],[1,1]],
      [[0,0],[1,0],[0,1],[1,1]],
      [[0,0],[1,0],[0,1],[1,1]]
    ],
    color: '#ffeb3b'
  },
  T: {
    shapes: [
      [[0,0],[1,0],[2,0],[1,1]],
      [[0,0],[0,1],[0,2],[1,1]],
      [[1,0],[0,1],[1,1],[2,1]],
      [[0,1],[1,0],[1,1],[1,2]]
    ],
    color: '#9c27b0'
  },
  S: {
    shapes: [
      [[1,0],[2,0],[0,1],[1,1]],
      [[0,0],[0,1],[1,1],[1,2]],
      [[1,0],[2,0],[0,1],[1,1]],
      [[0,0],[0,1],[1,1],[1,2]]
    ],
    color: '#4caf50'
  },
  Z: {
    shapes: [
      [[0,0],[1,0],[1,1],[2,1]],
      [[1,0],[0,1],[1,1],[0,2]],
      [[0,0],[1,0],[1,1],[2,1]],
      [[1,0],[0,1],[1,1],[0,2]]
    ],
    color: '#f44336'
  },
  J: {
    shapes: [
      [[0,0],[0,1],[1,1],[2,1]],
      [[0,0],[1,0],[0,1],[0,2]],
      [[0,1],[1,1],[2,1],[2,0]],
      [[0,2],[0,1],[0,0],[1,2]]
    ],
    color: '#2196f3'
  },
  L: {
    shapes: [
      [[2,0],[0,1],[1,1],[2,1]],
      [[0,0],[0,1],[0,2],[1,0]],
      [[0,1],[1,1],[2,1],[0,0]],
      [[0,2],[0,1],[0,0],[1,2]]
    ],
    color: '#ff9800'
  }
}
const TETRO_NAMES = Object.keys(TETROMINOS)

// ---- 游戏内部变量（不渲染到界面，所以不用 ref）----
let board = []            // 游戏盘：board[row][col] = '#颜色' 或 null
let currentPiece = null   // { name, rotation, x, y }
let nextPieceName = ''
let gameLoopId = null
let dropInterval = 800    // 自动下落间隔（毫秒），随等级加快
let lastDropTime = 0

// ---- Canvas 渲染相关 ----
let ctx = null
let nextCtx = null

// ==================== 游戏逻辑 ====================

/** 初始化空棋盘 */
function createBoard() {
  board = []
  for (let r = 0; r < ROWS; r++) {
    board.push(new Array(COLS).fill(null))
  }
}

/** 随机生成一个方块名 */
function randomPiece() {
  return TETRO_NAMES[Math.floor(Math.random() * TETRO_NAMES.length)]
}

/** 获取方块的当前形状坐标 */
function getShape(name, rotation) {
  return TETROMINOS[name].shapes[rotation]
}

/** 检查方块是否与棋盘或边界冲突 */
function collides(name, rotation, px, py) {
  const shape = getShape(name, rotation)
  for (const [dx, dy] of shape) {
    const x = px + dx
    const y = py + dy
    if (x < 0 || x >= COLS || y >= ROWS) return true
    if (y >= 0 && board[y][x] !== null) return true
  }
  return false
}

/** 将当前方块"烧录"到棋盘上 */
function lockPiece() {
  const { name, rotation, x, y } = currentPiece
  const shape = getShape(name, rotation)
  const color = TETROMINOS[name].color
  for (const [dx, dy] of shape) {
    const bx = x + dx
    const by = y + dy
    if (by < 0) continue // 方块超出顶部 → 游戏结束
    board[by][bx] = color
  }
}

/** 消除满行，返回消除的行数 */
function clearLines() {
  let cleared = 0
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r].every(cell => cell !== null)) {
      // 移除满行，顶部补空行
      board.splice(r, 1)
      board.unshift(new Array(COLS).fill(null))
      cleared++
      r++ // 再检查同一行
    }
  }
  return cleared
}

/** 生成新方块 */
function spawnPiece() {
  const name = nextPieceName || randomPiece()
  nextPieceName = randomPiece()
  currentPiece = {
    name,
    rotation: 0,
    x: Math.floor((COLS - 4) / 2), // 居中偏左
    y: -1 // 从顶部上方出现，只露出底部
  }
  // 如果出生即碰撞 → 游戏结束
  if (collides(name, 0, currentPiece.x, currentPiece.y)) {
    gameOver.value = true
    gameStarted.value = false
    if (gameLoopId) {
      cancelAnimationFrame(gameLoopId)
      gameLoopId = null
    }
  }
  drawNext()
}

/** 移动当前方块 */
function move(dx, dy) {
  if (!gameStarted.value || gameOver.value || paused.value) return false
  const { name, rotation, x, y } = currentPiece
  if (!collides(name, rotation, x + dx, y + dy)) {
    currentPiece.x += dx
    currentPiece.y += dy
    return true
  }
  // 向下移动被阻挡 → 锁定方块
  if (dy > 0) {
    lockPiece()
    const cleared = clearLines()
    if (cleared > 0) {
      lines.value += cleared
      // 计分：1行=100, 2行=300, 3行=500, 4行=800（乘以当前等级）
      const points = [0, 100, 300, 500, 800][cleared]
      score.value += points * level.value
      // 每消除10行升一级
      level.value = Math.floor(lines.value / 10) + 1
      dropInterval = Math.max(50, 800 - (level.value - 1) * 70)
    }
    spawnPiece()
  }
  return false
}

/** 旋转方块（顺时针）*/
function rotate() {
  if (!gameStarted.value || gameOver.value || paused.value) return
  const { name, rotation, x, y } = currentPiece
  const newRotation = (rotation + 1) % 4
  // 尝试原位置旋转
  if (!collides(name, newRotation, x, y)) {
    currentPiece.rotation = newRotation
    return
  }
  // SRS 踢墙：尝试左右偏移一格
  for (const offset of [-1, 1, -2, 2]) {
    if (!collides(name, newRotation, x + offset, y)) {
      currentPiece.x += offset
      currentPiece.rotation = newRotation
      return
    }
  }
}

/** 硬降（直接落底）*/
function hardDrop() {
  if (!gameStarted.value || gameOver.value || paused.value) return
  let dropped = 0
  while (!collides(currentPiece.name, currentPiece.rotation, currentPiece.x, currentPiece.y + 1)) {
    currentPiece.y++
    dropped++
  }
  score.value += dropped * 2 // 硬降加分
  lockPiece()
  const cleared = clearLines()
  if (cleared > 0) {
    lines.value += cleared
    const points = [0, 100, 300, 500, 800][cleared]
    score.value += points * level.value
    level.value = Math.floor(lines.value / 10) + 1
    dropInterval = Math.max(50, 800 - (level.value - 1) * 70)
  }
  spawnPiece()
}

/** 切换暂停 */
function togglePause() {
  if (!gameStarted.value || gameOver.value) return
  paused.value = !paused.value
}

// ==================== 渲染 ====================

/** 绘制棋盘 */
function drawBoard() {
  if (!ctx) return
  // 背景
  ctx.fillStyle = '#1a1a2e'
  ctx.fillRect(0, 0, canvasWidth, canvasHeight)
  // 网格线
  ctx.strokeStyle = '#2a2a4a'
  ctx.lineWidth = 0.5
  for (let r = 0; r <= ROWS; r++) {
    ctx.beginPath()
    ctx.moveTo(0, r * CELL)
    ctx.lineTo(COLS * CELL, r * CELL)
    ctx.stroke()
  }
  for (let c = 0; c <= COLS; c++) {
    ctx.beginPath()
    ctx.moveTo(c * CELL, 0)
    ctx.lineTo(c * CELL, ROWS * CELL)
    ctx.stroke()
  }
  // 已锁定的方块
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (board[r][c]) {
        drawCell(ctx, c, r, board[r][c])
      }
    }
  }
  // 当前活动方块
  if (currentPiece && !gameOver.value) {
    const { name, rotation, x, y } = currentPiece
    const shape = getShape(name, rotation)
    const color = TETROMINOS[name].color
    for (const [dx, dy] of shape) {
      const px = x + dx
      const py = y + dy
      if (py >= 0) {
        drawCell(ctx, px, py, color)
      }
    }
    // 方块投影（显示落点）
    let ghostY = y
    while (!collides(name, rotation, x, ghostY + 1)) ghostY++
    if (ghostY > y) {
      ctx.globalAlpha = 0.25
      for (const [dx, dy] of shape) {
        const px = x + dx
        const py = ghostY + dy
        if (py >= 0) drawCell(ctx, px, py, color)
      }
      ctx.globalAlpha = 1
    }
  }
}

/** 绘制单个格子 */
function drawCell(ctx, col, row, color) {
  const x = col * CELL
  const y = row * CELL
  const inset = 1
  // 主体
  ctx.fillStyle = color
  ctx.fillRect(x + inset, y + inset, CELL - inset * 2, CELL - inset * 2)
  // 高光边（左上）
  ctx.fillStyle = 'rgba(255,255,255,0.3)'
  ctx.fillRect(x + inset, y + inset, CELL - inset * 2, 3)
  ctx.fillRect(x + inset, y + inset, 3, CELL - inset * 2)
  // 阴影边（右下）
  ctx.fillStyle = 'rgba(0,0,0,0.3)'
  ctx.fillRect(x + inset, y + CELL - 3 - inset, CELL - inset * 2, 3)
  ctx.fillRect(x + CELL - 3 - inset, y + inset, 3, CELL - inset * 2)
}

/** 绘制下一个方块预览 */
function drawNext() {
  if (!nextCtx) return
  nextCtx.fillStyle = '#1a1a2e'
  nextCtx.fillRect(0, 0, nextCanvasSize, nextCanvasSize)
  if (!nextPieceName) return
  const shape = TETROMINOS[nextPieceName].shapes[0]
  const color = TETROMINOS[nextPieceName].color
  // 居中绘制
  const minX = Math.min(...shape.map(s => s[0]))
  const maxX = Math.max(...shape.map(s => s[0]))
  const minY = Math.min(...shape.map(s => s[1]))
  const maxY = Math.max(...shape.map(s => s[1]))
  const pw = maxX - minX + 1
  const ph = maxY - minY + 1
  const offsetX = Math.floor((4 - pw) / 2) - minX
  const offsetY = Math.floor((4 - ph) / 2) - minY
  for (const [dx, dy] of shape) {
    drawCell(nextCtx, dx + offsetX, dy + offsetY, color)
  }
}

// ==================== 游戏循环 ====================

function gameLoop(timestamp) {
  if (!gameStarted.value || gameOver.value || paused.value) {
    gameLoopId = requestAnimationFrame(gameLoop)
    return
  }
  if (timestamp - lastDropTime > dropInterval) {
    move(0, 1)
    lastDropTime = timestamp
  }
  drawBoard()
  gameLoopId = requestAnimationFrame(gameLoop)
}

// ==================== 开始 / 重置 ====================

function startGame() {
  createBoard()
  score.value = 0
  level.value = 1
  lines.value = 0
  gameOver.value = false
  paused.value = false
  gameStarted.value = true
  dropInterval = 800
  lastDropTime = performance.now()
  nextPieceName = randomPiece()
  spawnPiece()
  if (gameLoopId) cancelAnimationFrame(gameLoopId)
  gameLoopId = requestAnimationFrame(gameLoop)
  // 聚焦画布以接收键盘事件
  canvasRef.value?.focus()
}

// ==================== 键盘事件 ====================

function onKeyDown(e) {
  if (!gameStarted.value || gameOver.value) return
  // 暂停切换
  if (e.key === 'p' || e.key === 'P') {
    togglePause()
    return
  }
  if (paused.value) return
  switch (e.key) {
    case 'ArrowLeft':  move(-1, 0); e.preventDefault(); break
    case 'ArrowRight': move(1, 0);  e.preventDefault(); break
    case 'ArrowDown':  move(0, 1);  e.preventDefault(); break
    case 'ArrowUp':    rotate();     e.preventDefault(); break
    case ' ':          hardDrop();   e.preventDefault(); break
  }
}

// ==================== 生命周期 ====================

onMounted(() => {
  ctx = canvasRef.value?.getContext('2d')
  nextCtx = nextCanvasRef.value?.getContext('2d')
  createBoard()
  drawBoard()
  drawNext()
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

/* 游戏结束遮罩 */
.game-over-overlay, .pause-overlay {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.7);
  display: flex;
  align-items: center;
  justify-content: center;
}
.game-over-box, .pause-box {
  text-align: center;
  color: #fff;
}
.game-over-box h3, .pause-box h3 {
  margin: 0 0 12px 0;
  font-size: 22px;
}
.game-over-box p {
  margin: 0 0 16px 0;
  font-size: 18px;
}

/* 信息面板 */
.info-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 160px;
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
