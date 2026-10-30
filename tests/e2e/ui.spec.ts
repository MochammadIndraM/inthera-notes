import { test, expect } from "@playwright/test";

test("konfigurasi database jelas dan responsif di 320px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/setup");
  await expect(
    page.getByRole("heading", { name: "Konfigurasi database diperlukan" }),
  ).toBeVisible();
  await expect(
    page.getByText("Belum ada data pengguna yang dimuat.", { exact: false }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("tanpa konfigurasi, route privat diarahkan ke setup", async ({ page }) => {
  test.skip(
    !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    "Backend dikonfigurasi; redirect login diuji pada suite backend.",
  );
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/setup$/);
});
for (const width of [320, 390, 768, 1440]) {
  test(`workspace fixture tanpa overflow pada ${width}px`, async ({ page }) => {
    test.skip(
      !!process.env.E2E_BASE_URL,
      "Fixture hanya tersedia pada dev server terisolasi.",
    );
    await page.setViewportSize({ width, height: 960 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error" && /hydrat/i.test(message.text()))
        errors.push(message.text());
    });
    await page.goto("/dev-preview");
    await expect(
      page.getByRole("heading", { name: "Selamat datang, Pengguna." }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/workspace-${width}-light.png`,
      fullPage: true,
      caret: "initial",
    });
    await page
      .getByRole("button", { name: "Tambah tugas", exact: true })
      .click();
    const dialog = page.getByRole("dialog", {
      name: "Tambah tugas",
      exact: true,
    });
    await expect(
      dialog.getByLabel("Apa yang ingin diselesaikan?"),
    ).toBeFocused();
    await dialog
      .getByLabel("Apa yang ingin diselesaikan?")
      .fill("Tugas pengujian");
    await dialog.getByText("Detail & pengaturan tugas").click();
    await expect(dialog.getByLabel("Prioritas")).toBeVisible();
    const description = dialog.getByLabel("Deskripsi", { exact: true });
    const multiline = Array.from(
      { length: 12 },
      (_, index) => `${index + 1}. Langkah dan catatan untuk tugas ini.`,
    ).join("\n");
    await description.fill(multiline);
    const textArea = await description.evaluate((element) => {
      const styles = getComputedStyle(element);
      return {
        fontSize: parseFloat(styles.fontSize),
        visibleLines:
          (element.clientHeight -
            parseFloat(styles.paddingTop) -
            parseFloat(styles.paddingBottom)) /
          parseFloat(styles.lineHeight),
      };
    });
    expect(textArea.fontSize).toBeGreaterThanOrEqual(16);
    expect(textArea.visibleLines).toBeGreaterThanOrEqual(7);
    await dialog.getByLabel("Apa yang ingin diselesaikan?").focus();
    await expect(description).toHaveValue(multiline);
    if (width === 390 || width === 1440) {
      await description.evaluate((element) => {
        element.scrollTop = 0;
      });
      await dialog.screenshot({
        path: `test-results/task-description-${width}.png`,
        caret: "initial",
      });
    }
    expect(
      await dialog.evaluate(
        (element) => element.scrollWidth <= element.clientWidth,
      ),
    ).toBe(true);
    page.once("dialog", (prompt) => prompt.accept());
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await expect(
      page.getByRole("button", { name: "Tambah tugas", exact: true }),
    ).toBeFocused();
    await page
      .locator(".panel-header")
      .getByRole("button", { name: "Catat transaksi" })
      .click();
    const transaction = page.getByRole("dialog", { name: "Catat transaksi" });
    await transaction
      .getByRole("button", { name: "Transfer", exact: true })
      .click();
    await expect(transaction.getByLabel("Dari akun")).toBeVisible();
    await expect(transaction.getByLabel("Ke akun")).toBeVisible();
    await expect(
      transaction.getByLabel("Kategori", { exact: true }),
    ).toHaveCount(0);
    expect(
      await transaction.evaluate(
        (element) => element.scrollWidth <= element.clientWidth,
      ),
    ).toBe(true);
    await page.keyboard.press("Escape");
    if (width < 1024) {
      await page.getByRole("button", { name: "Buka menu" }).click();
      await expect(
        page.getByRole("dialog", { name: "Menu seluler" }),
      ).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(
        page.getByRole("dialog", { name: "Menu seluler" }),
      ).not.toBeVisible();
    } else {
      await page.getByRole("button", { name: "Ciutkan sidebar" }).click();
      await expect(page.locator(".app-shell")).toHaveClass(/sidebar-collapsed/);
    }
    await page.evaluate(
      () => (document.documentElement.dataset.theme = "dark"),
    );
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    expect(
      await page.evaluate(
        () => getComputedStyle(document.body).backgroundColor,
      ),
    ).toBe("rgb(20, 20, 28)");
    expect(errors).toEqual([]);
    await page.evaluate(() => {
      (document.activeElement as HTMLElement)?.blur();
      window.scrollTo(0, 0);
    });
    await page.screenshot({
      path: `test-results/workspace-${width}-dark.png`,
      fullPage: true,
      caret: "initial",
    });
  });
}
