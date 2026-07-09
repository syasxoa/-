import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import legacy from '@vitejs/plugin-legacy'
import path from 'path'

// GitHub Pages 部署路径（仓库名以 - 结尾，站点路径为 /-/）
const BASE = process.env.BUILD_PAGES === '1' ? '/-/' : '/'

export default defineConfig({
  base: BASE,
  plugins: [
    vue(),
    // ★ 旧浏览器兼容：自动生成 <script nomodule> 回退版本 + polyfills
    // 解决华为卓易通等旧 WebView 不支持 ES module 导致的白屏
    legacy({
      targets: ['defaults', 'android >= 4.4', 'ios >= 10'],
      polyfills: true,
      modernPolyfills: false
    }),
    // 修正 gh-pages 部署时 icon/manifest 路径
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
  // 转译现代语法（?? .? 等）确保旧浏览器不报语法错误
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
