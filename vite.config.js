import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

// GitHub Pages 部署路径（仓库名以 - 结尾，GitHub 生成的站点路径为 /-/）
const BASE = process.env.BUILD_PAGES === '1' ? '/-/' : '/'

export default defineConfig({
  base: BASE,
  plugins: [
    vue(),
    // 构建时修正 index.html 中 icon/manifest 等静态资源的引用路径
    {
      name: 'fix-html-paths',
      enforce: 'post',
      transformIndexHtml(html) {
        if (BASE === '/') return html
        return html
          .replace(/href="\/icon\.svg"/g, `href="${BASE}icon.svg"`)
          .replace(/href="\/manifest\.json"/g, `href="${BASE}manifest.json"`)
      }
    }
  ],
  // ★ 关键：转译 JS 为 ES2015，解决旧版 WebView（华为卓易通等）不支持 ?? ?. 语法导致白屏
  build: {
    target: 'es2015'
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      ignored: ['**/src-tauri/**']
    }
  }
})
