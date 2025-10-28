import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,          // ✅ React frontend port
    strictPort: true,    // ✅ ensures Vite fails if port is already taken
  },
})
