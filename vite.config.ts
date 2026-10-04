/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  // Tools that assign a port (e.g. a preview pane) pass it as PORT; default stays 5173.
  server: process.env.PORT ? { port: Number(process.env.PORT), strictPort: true } : {},
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
    setupFiles: ['src/test/setup.ts'],
  },
})
