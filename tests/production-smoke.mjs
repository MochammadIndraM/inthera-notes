import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd());
const configured = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
);
const server = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "start",
    "--hostname",
    "127.0.0.1",
    "--port",
    "3101",
  ],
  {
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
    stdio: "ignore",
    windowsHide: true,
  },
);
const origin = "http://127.0.0.1:3101";
try {
  let ready = false;
  for (let i = 0; i < 60; i++) {
    try {
      if (
        (await fetch(origin + "/setup", { signal: AbortSignal.timeout(1000) }))
          .ok
      ) {
        ready = true;
        break;
      }
    } catch {
      /* Wait for the owned production server. */
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.ok(
    ready,
    "Production server belum siap; jalankan npm run build terlebih dahulu.",
  );
  for (const path of [
    "/setup",
    "/dashboard",
    "/tasks",
    "/finance",
    "/settings",
    "/dev-preview",
    "/api/cron/task-reminders",
    "/icon.svg",
  ]) {
    const response = await fetch(origin + path, {
      redirect: "manual",
      signal: AbortSignal.timeout(10000),
    });
    const body = await response.text();
    if (["/dashboard", "/tasks", "/finance", "/settings"].includes(path)) {
      const target = configured ? "/login" : "/setup";
      // With a loading boundary, Next can emit a streaming meta redirect with HTTP 200.
      assert.ok(
        response.headers.get("location")?.endsWith(target) ||
          (response.status === 200 && body.includes("url=" + target)),
        path + " harus dilindungi auth/config.",
      );
    } else
      assert.equal(
        response.status,
        path === "/dev-preview"
          ? 404
          : path === "/api/cron/task-reminders"
            ? 401
            : 200,
        path,
      );
    console.log(path + " => " + response.status + " OK");
  }
} finally {
  server.kill();
}
