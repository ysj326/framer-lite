import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
// base 경로 분기:
// - dev (npm run dev)            : '/'             → localhost:5173/
// - build/preview (production)   : '/framer-lite/' → GitHub Pages URL과 일치
export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? '/framer-lite/' : '/',
  plugins: [
    vue(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  test: {
    environment: 'happy-dom',
    globals: true,
  },
}))
