import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  // 防止 Vite 掩盖 Rust 错误
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      // 监听 src-tauri 目录变化
      ignored: ['**/src-tauri/**']
    }
  }
})
