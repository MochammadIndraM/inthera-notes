import { test, expect, type Page } from "@playwright/test";

async function ready(page: Page) {
  await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, {
    timeout: 20000,
  });
}

test("manifest, ikon PNG, Apple icon, dan header service worker valid", async ({
  page,
  request,
}) => {
  await page.goto("/login");
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
    "href",
    "/manifest.webmanifest",
  );
  await expect(page.locator('meta[name="viewport"]')).toHaveAttribute(
    "content",
    /viewport-fit=cover/,
  );
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute(
    "href",
    "/icons/apple-touch-icon.png",
  );
  const response = await request.get("/manifest.webmanifest");
  expect(response.ok()).toBe(true);
  const manifest = await response.json();
  expect(manifest).toMatchObject({
    name: "IntheraNotes",
    display: "standalone",
    scope: "/",
    start_url: "/dashboard",
  });
  expect(
    manifest.icons.some(
      (icon: { purpose: string }) => icon.purpose === "maskable",
    ),
  ).toBe(true);
  for (const icon of [
    ...manifest.icons,
    { src: "/icons/apple-touch-icon.png", sizes: "180x180" },
  ]) {
    const image = await request.get(icon.src);
    expect(image.ok()).toBe(true);
    expect(image.headers()["content-type"]).toContain("image/png");
    const body = await image.body();
    const [width, height] = icon.sizes.split("x").map(Number);
    expect(body.readUInt32BE(16)).toBe(width);
    expect(body.readUInt32BE(20)).toBe(height);
  }
  const sw = await request.get("/sw.js");
  expect(sw.headers()["content-type"]).toContain("application/javascript");
  expect(sw.headers()["cache-control"]).toContain("no-store");
  expect(sw.headers()["service-worker-allowed"]).toBe("/");
  expect(sw.headers()["set-cookie"]).toBeUndefined();
});

test("worker produksi terpasang; offline, retry, dan cache tetap publik", async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/login");
  await ready(page);
  const cached = await page.evaluate(async () => {
    const names = (await caches.keys()).filter((name) =>
      name.startsWith("inthera-pwa-"),
    );
    return (
      await Promise.all(
        names.map(async (name) =>
          (await (await caches.open(name)).keys()).map(
            (r) => new URL(r.url).pathname,
          ),
        ),
      )
    ).flat();
  });
  expect(cached).toHaveLength(5);
  expect(
    cached.every(
      (path) => path === "/offline.html" || path.startsWith("/icons/"),
    ),
  ).toBe(true);
  await context.setOffline(true);
  await expect(
    page.getByText("Koneksi terputus", { exact: true }),
  ).toBeVisible();
  await page.goto("/dashboard");
  await expect(
    page.getByRole("heading", { name: "Kita sambung sebentar lagi." }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/dashboard$/);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/pwa-offline-mobile.png",
    fullPage: true,
  });
  await context.setOffline(false);
  await page.getByRole("button", { name: "Coba lagi" }).click();
  await expect(page).toHaveURL(/\/(login|setup)$/);
});

test("form offline mempertahankan isian tanpa mengirim Server Action", async ({
  page,
  context,
}) => {
  await page.goto("/login");
  await ready(page);
  await page.getByLabel("Alamat email").fill("offline@example.test");
  await page
    .getByLabel("Password", { exact: true })
    .fill("offline-password-123");
  let posts = 0;
  page.on("request", (r) => {
    if (r.method() === "POST") posts++;
  });
  await context.setOffline(true);
  await page.getByRole("button", { name: "Masuk ke workspace" }).click();
  await expect(page.locator("form").getByRole("alert")).toContainText(
    "Kamu sedang offline",
  );
  await expect(page.getByLabel("Alamat email")).toHaveValue(
    "offline@example.test",
  );
  await expect(page.getByLabel("Password", { exact: true })).toHaveValue(
    "offline-password-123",
  );
  expect(posts).toBe(0);
});

test("tombol instalasi memakai prompt browser dan menangani pembatalan", async ({
  page,
}) => {
  await page.goto("/login");
  await ready(page);
  await page.evaluate(() => {
    const event = new Event("beforeinstallprompt", { cancelable: true });
    Object.assign(event, {
      prompt: async () => {
        document.documentElement.dataset.installPromptCalled = "true";
      },
      userChoice: Promise.resolve({ outcome: "dismissed" }),
    });
    window.dispatchEvent(event);
  });
  await page
    .getByRole("button", { name: "Pasang aplikasi", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "Pasang IntheraNotes" });
  await dialog.getByRole("button", { name: "Pasang sekarang" }).click();
  await expect(page.locator("html")).toHaveAttribute(
    "data-install-prompt-called",
    "true",
  );
  await expect(dialog.getByRole("status")).toContainText(
    "menu browser kapan saja",
  );
  await expect(
    dialog.getByRole("button", { name: "Pasang sekarang" }),
  ).toHaveCount(0);
});

test("panduan iPhone tetap tersedia tanpa beforeinstallprompt", async ({
  browser,
}) => {
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1",
    viewport: { width: 320, height: 740 },
    isMobile: true,
    hasTouch: true,
  });
  try {
    const page = await context.newPage();
    await page.goto("http://127.0.0.1:3141/login");
    await page
      .getByRole("button", { name: "Pasang aplikasi", exact: true })
      .click();
    const dialog = page.getByRole("dialog", { name: "Pasang IntheraNotes" });
    await expect(
      dialog.getByText("Pasang melalui Safari", { exact: true }),
    ).toBeVisible();
    await expect(dialog.getByText("Bagikan", { exact: true })).toBeVisible();
    await expect(
      dialog.getByText("Tambahkan ke Layar Utama", { exact: true }),
    ).toBeVisible();
    expect(await dialog.evaluate((e) => e.scrollWidth <= e.clientWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: "test-results/pwa-install-iphone.png",
      fullPage: true,
    });
  } finally {
    await context.close();
  }
});
