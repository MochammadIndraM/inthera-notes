import { test, expect } from "@playwright/test";

test.beforeEach(() => {
  test.skip(
    !!process.env.E2E_BASE_URL,
    "Fixture memerlukan dev server terisolasi.",
  );
});

test("banner dapat ditunda tanpa menghilangkan akses pemasangan di pengaturan", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/dev-preview");
  const settings = page.locator("#install-app");
  await settings
    .getByRole("button", { name: "Pasang aplikasi", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "Pasang IntheraNotes" });
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await page.evaluate(() => {
    const event = new Event("beforeinstallprompt", { cancelable: true });
    Object.assign(event, {
      prompt: async () => {},
      userChoice: Promise.resolve({ outcome: "dismissed" }),
    });
    window.dispatchEvent(event);
  });
  const banner = page.getByRole("region", {
    name: "Pasang aplikasi IntheraNotes",
  });
  await expect(banner).toBeVisible();
  await banner
    .getByRole("button", { name: "Ingatkan pemasangan nanti" })
    .click();
  await expect(banner).toHaveCount(0);
  expect(
    await page.evaluate(
      () =>
        Number(localStorage.getItem("inthera-install-dismissed-until")) >
        Date.now(),
    ),
  ).toBe(true);
  await settings.scrollIntoViewIfNeeded();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await settings.screenshot({
    path: "test-results/pwa-settings-mobile.png",
    caret: "initial",
  });
  await settings
    .getByRole("button", { name: "Pasang aplikasi", exact: true })
    .click();
  await expect(
    dialog.getByRole("button", { name: "Pasang sekarang" }),
  ).toBeVisible();
});

test("mode standalone menyembunyikan ajakan pemasangan dan menunjukkan status aplikasi", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = window.matchMedia.bind(window);
    window.matchMedia = (query) => {
      const result = original(query);
      if (query === "(display-mode: standalone)")
        Object.defineProperty(result, "matches", { value: true });
      return result;
    };
  });
  await page.goto("/dev-preview");
  const settings = page.locator("#install-app");
  await expect(
    settings.locator(".pwa-label").filter({ hasText: "Aplikasi terpasang" }),
  ).toBeVisible();
  await expect(page.locator(".pwa-nav-install")).toHaveCount(0);
  await expect(page.locator(".pwa-install-banner")).toHaveCount(0);
});
