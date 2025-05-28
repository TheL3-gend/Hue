import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  resolve: {
    alias: {
      '@components': '/src/components',
      '@contexts': '/src/contexts',
      '@constants': '/src/constants',
      '@': '/src',
    },
  },
  // Only env vars prefixed with VITE_ are exposed
  envPrefix: 'VITE_',
})