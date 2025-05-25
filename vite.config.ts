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
      '@utils': '/src/utils', // Added for consistency if needed later
      '@constants': '/src/constants',
      '@': '/src', // Common alias for src root
      '@tailwindcss()': '/src/tailwindcss', // Alias for Tailwind CSS config
      '@autoprefixer()': '/src/autoprefixer', // Alias for Autoprefixer config
    },
  },
  // Only env vars prefixed with VITE_ are exposed
  envPrefix: 'VITE_',
})