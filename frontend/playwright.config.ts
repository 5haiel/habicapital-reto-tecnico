import { defineConfig, devices } from '@playwright/test'

// End-to-end tests drive the real app (real backend + Postgres), not
// mocks. The backend must already be running on :8000
// (`docker compose up -d db backend`); the Vite dev server is started here
// if it isn't running yet.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5173',
    locale: 'es-CO',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : { command: 'npm run dev', url: 'http://localhost:5173', reuseExistingServer: true },
})
