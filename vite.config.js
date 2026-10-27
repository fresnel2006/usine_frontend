import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    // Recharts seul pèse un peu plus de 500 ko
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // Les graphiques (Recharts) dans un fichier à part : l'application se charge plus vite
        manualChunks: { graphiques: ['recharts'] },
      },
    },
  },
})
