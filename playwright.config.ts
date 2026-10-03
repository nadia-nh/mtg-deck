import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: 'e2e',
  use: {
    baseURL: 'http://localhost:4173',
    // Optional: point at a preinstalled Chromium instead of Playwright's download.
    launchOptions: process.env.PW_CHROMIUM_PATH
      ? { executablePath: process.env.PW_CHROMIUM_PATH }
      : undefined,
  },
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
  },
})
