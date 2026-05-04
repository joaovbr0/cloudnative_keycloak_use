import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Proxy: frontend chama /auth/* e /tokens/* → backend :3001
    // Resolve problema de cookie cross-port (5173 → 3001)
    proxy: {
      '/auth': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/tokens': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/api-docs': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
