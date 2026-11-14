import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
    open: false,
  },
  build: {
    target: 'es2018',
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        // Split vendor code so browser caches update less often
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (/recharts|d3-|victory-vendor|internmap|delaunator|robust-predicates/.test(id)) return 'charts'
          return 'vendor'
        },
      },
    },
  },
})
