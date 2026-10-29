import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/pwa",
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  use: {
    baseURL: "http://127.0.0.1:3141",
    headless: true,
    channel:
      process.env.E2E_BROWSER_CHANNEL ||
      (process.platform === "win32" ? "msedge" : "chromium"),
    serviceWorkers: "allow",
    trace: "retain-on-failure",
  },
  webServer: {
    command:
      "node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3141",
    url: "http://127.0.0.1:3141/offline.html",
    reuseExistingServer: false,
    timeout: 60000,
    env: { NEXT_TELEMETRY_DISABLED: "1" },
  },
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "playwright-report/pwa" }],
  ],
});
