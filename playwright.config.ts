import { defineConfig, devices } from "@playwright/test";

// The e2e suite runs its own Vite dev server on a dedicated port so it never
// reuses a dev server you already have open (which would talk to the real API).
const PORT = 5180;

// All API calls are pointed at this fake origin and answered by page.route()
// mocks in e2e/fixtures.ts, so the tests need no backend and no real login.
export const MOCK_API = "http://127.0.0.1:5199/api";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npm run dev -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    // Process env wins over .env in Vite, so this overrides the real API URL.
    env: { VITE_API_BASE_URL: MOCK_API },
  },
});
