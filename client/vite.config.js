import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      // у Docker цільовий адрес задається змінною VITE_API_PROXY (http://backend:3000)
      '/api': process.env.VITE_API_PROXY || 'http://localhost:3000'
    }
  }
})