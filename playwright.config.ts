import {defineConfig, devices} from '@playwright/test'

const PORT = 3210

/**
 * E2E config. Uses the locally-installed Google Chrome (`channel: 'chrome'`) so
 * no browser download is needed (our .npmrc sets ignore-scripts, which skips
 * Playwright's browser install). In CI without Chrome, run
 * `npx playwright install chromium` and drop the `channel` below.
 *
 * The webServer builds and serves the production app so the strict middleware
 * CSP (which only applies to dynamically-rendered responses) is exercised.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: {timeout: 30_000},
  use: {
    baseURL: `http://localhost:${PORT}`,
    channel: 'chrome',
    headless: true,
  },
  projects: [{name: 'chromium', use: {...devices['Desktop Chrome']}}],
  webServer: {
    command: `npm run build && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    timeout: 180_000,
    reuseExistingServer: true,
  },
})
