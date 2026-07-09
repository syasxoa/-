import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

// GitHub Pages 部署路径（仓库名以 - 结尾，GitHub 生成的站点路径为 /-/）
const BASE = process.env.BUILD_PAGES === '1' ? '/-/' : '/'

export default defineConfig({
  base: BASE,
  plugins: [
    vue(),
    // 构建后修正 index.html 中的路径，确保静态资源在 gh-pages 下路径正确
    {
      name: 'fix-html-paths',
      enforce: 'post',
      transformIndexHtml(html) {
        let result = html
        // 替换 icon、manifest 等静态资源的绝对路径
        if (BASE !== '/') {
          result = result
            .replace(/href="\/icon\.svg"/g, `href="${BASE}icon.svg"`)
            .replace(/href="\/manifest\.json"/g, `href="${BASE}manifest.json"`)
        }
        // 在 </body> 前注入 Service Worker 注册脚本（使用正确的 BASE 路径）
        const swScript = `<script>
  // PWA Service Worker 注册（路径自动适配 / 或 gh-pages 的 /-/ ）
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('${BASE}sw.js').catch(function(){})
  }
</script>`
        result = result.replace('</body>', swScript + '\n</body>')
        return result
      }
    }
  ],
  // ★ 关键修复：转译 JS 为 ES2015，解决旧版 WebView（华为卓易通等）不支持 ?? ?. 语法导致白屏
  // Vue 3 源码大量使用这些现代语法，不转译会在旧浏览器上直接崩溃
  build: {
    target: 'es2015'
  },
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
