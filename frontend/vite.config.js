import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Forward API and auth requests to backend during development
      '/api': {
        target: 'https://clicklink-flax.vercel.app',
        changeOrigin: true,
        secure: false,
      },
      '/auth': {
        target: 'https://clicklink-flax.vercel.app',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
