import {defineConfig, devices} from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  reporter: "line",
  use: {
    baseURL: "http://127.0.0.1:8000",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "desktop-chromium",
      use: {...devices["Desktop Chrome"]},
    },
    {
      name: "mobile-chromium",
      use: {...devices["Pixel 7"]},
    },
  ],
  webServer: {
    command:
      "cd .. && python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000",
    url: "http://127.0.0.1:8000/api/v1/health/ready",
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
