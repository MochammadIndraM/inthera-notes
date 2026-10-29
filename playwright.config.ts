import { defineConfig } from "@playwright/test";
import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  use: {
    baseURL: process.env.E2E_BASE_URL || "http://127.0.0.1:3100",
    headless: true,
    channel:
      process.env.E2E_BROWSER_CHANNEL ||
      (process.platform === "win32" ? "msedge" : "chromium"),
    trace: "retain-on-failure",
  },
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command:
          "node node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port 3100",
        url: "http://127.0.0.1:3100/setup",
        reuseExistingServer: false,
        timeout: 120000,
        env: { INTHERA_UI_TEST: "1", NEXT_TELEMETRY_DISABLED: "1" },
      },
  reporter: [["list"], ["html", { open: "never" }]],
});
