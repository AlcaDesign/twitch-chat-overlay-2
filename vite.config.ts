import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  // https://vitejs.dev/config/shared-options.html#base
  base: '',
  plugins: [ vue() ],
  resolve: {
    alias: {
      '@lib': fileURLToPath(new URL('./src/lib', import.meta.url)),
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  build: {
    // https://rollupjs.org/guide/en/#big-list-of-options
    rollupOptions: {
      output: {
        assetFileNames: '[name].[hash].[ext]',
        entryFileNames: '[name].js',
      }
    }
  },
  server: {
    watch: {
      usePolling: true,
      useFsEvents: false,
    }
  }
})
