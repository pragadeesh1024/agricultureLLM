import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/',
  server: {
    port: 5173,
    proxy: {
      '/gradio_api': {
        target: 'https://pragadeesh10-agriapp2.hf.space',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
