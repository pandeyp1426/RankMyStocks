import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5001,          // ✅ React frontend port (changed from 5173)
    strictPort: true,    // ✅ ensures Vite fails if port is already taken
  },
  optimizeDeps: {
    include: [
      'apexcharts',
      'react-apexcharts'
    ],
  },
})
