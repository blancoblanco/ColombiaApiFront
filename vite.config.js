import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Vite 8 usa rolldown, donde manualChunks debe ser una funcion.
        // Separar vendors permite que el cache del navegador sobreviva a los
        // cambios de codigo de la app (react/axios cambian casi nunca).
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('axios')) return 'axios'
          if (/[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/.test(id)) {
            return 'react'
          }
          return 'vendor'
        }
      }
    }
  }
})
