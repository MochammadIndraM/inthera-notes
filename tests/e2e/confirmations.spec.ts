import { test, expect } from "@playwright/test";

test.beforeEach(() => {
  test.skip(
    !!process.env.E2E_BASE_URL,
    "Fixture memerlukan dev server terisolasi.",
  );
});

for (const width of [320, 390, 1440]) {
  test(`konfirmasi shadcn di atas form, menjaga isian, dan mengembalikan fokus pada ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    const native: string[] = [];
    page.on("dialog", async (dialog) => {
      native.push(dialog.type());
      await dialog.dismiss();
    });
    await page.goto("/dev-preview");
    const trigger = page.getByRole("button", {
      name: "Tambah tugas",
      exact: true,
    });
    await trigger.click();
    const editor = page.getByRole("dialog", {
      name: "Tambah tugas",
      exact: true,
    });
    const title = editor.getByLabel("Apa yang ingin diselesaikan?");
    await title.fill("Isian yang harus tetap tersimpan");
    await editor.getByRole("button", { name: "Tutup dialog" }).click();
    const alert = page.getByRole("alertdialog", { name: "Buang perubahan?" });
    const cancel = alert.getByRole("button", { name: "Lanjut mengedit" });
    await expect(alert).toBeVisible();
    await expect(cancel).toBeFocused();
    expect(
      await alert.evaluate((element) => {
        const bounds = element.getBoundingClientRect();
        return (
          bounds.left >= 0 &&
          bounds.right <= innerWidth &&
          element.scrollWidth <= element.clientWidth
        );
      }),
    ).toBe(true);
    await page.keyboard.press("Tab");
    await expect(
      alert.getByRole("button", { name: "Buang perubahan", exact: true }),
    ).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(cancel).toBeFocused();
    await cancel.click();
    await expect(alert).not.toBeVisible();
    await expect(editor).toBeVisible();
    await expect(title).toHaveValue("Isian yang harus tetap tersimpan");
    await expect(
      editor.getByRole("button", { name: "Tutup dialog" }),
    ).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(alert).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(alert).not.toBeVisible();
    await expect(editor).toBeVisible();
    await editor.getByRole("button", { name: "Tutup dialog" }).click();
    await alert.screenshot({ path: `test-results/confirmation-${width}.png` });
    await alert
      .getByRole("button", { name: "Buang perubahan", exact: true })
      .click();
    await expect(editor).not.toBeVisible();
    await expect(trigger).toBeFocused();
    expect(await page.evaluate(() => document.body.style.overflow)).not.toBe(
      "hidden",
    );
    expect(native).toEqual([]);
  });
}

test("batal hapus tidak mengirim aksi server; konfirmasi hapus memakai alertdialog", async ({
  page,
}) => {
  let posts = 0;
  page.on("request", (request) => {
    if (request.method() === "POST") posts++;
  });
  await page.goto("/dev-preview");
  const trash = page.getByRole("button", {
    name: "Hapus Tinjau kembali rencana minggu ini",
    exact: true,
  });
  await trash.click();
  const alert = page.getByRole("alertdialog", { name: "Hapus data?" });
  await expect(
    alert.getByRole("button", { name: "Batal", exact: true }),
  ).toBeFocused();
  await alert.getByRole("button", { name: "Batal", exact: true }).click();
  await expect(alert).not.toBeVisible();
  await expect(trash).toBeFocused();
  expect(posts).toBe(0);
});

test("form yang sedang menyimpan tidak dapat ditutup", async ({ page }) => {
  await page.goto("/dev-preview");
  await page.getByRole("button", { name: "Tambah tugas", exact: true }).click();
  const editor = page.getByRole("dialog", {
    name: "Tambah tugas",
    exact: true,
  });
  await editor.locator("form").evaluate((form) => {
    form.dataset.pending = "true";
  });
  await editor.getByRole("button", { name: "Tutup dialog" }).click();
  await expect(editor).toBeVisible();
  await expect(page.getByRole("alertdialog")).toHaveCount(0);
  await editor.locator("form").evaluate((form) => {
    delete form.dataset.pending;
  });
  await editor.getByRole("button", { name: "Tutup dialog" }).click();
  await expect(editor).not.toBeVisible();
});

test("hapus baru dikirim sesudah konfirmasi dan kegagalan tidak menghapus baris", async ({
  page,
}) => {
  let posts = 0;
  let release: (() => void) | undefined;
  await page.route("**/dev-preview", async (route) => {
    if (route.request().method() === "POST") {
      posts++;
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      await route.abort("failed");
    } else await route.continue();
  });
  try {
    await page.goto("/dev-preview");
    const trash = page.getByRole("button", {
      name: "Hapus Tinjau kembali rencana minggu ini",
      exact: true,
    });
    await trash.click();
    expect(posts).toBe(0);
    await page
      .getByRole("alertdialog", { name: "Hapus data?" })
      .getByRole("button", { name: "Ya, hapus data" })
      .click();
    await expect.poll(() => posts).toBe(1);
    await expect(trash).toBeDisabled();
    expect(
      await page.evaluate(() => {
        const event = new Event("beforeunload", { cancelable: true });
        window.dispatchEvent(event);
        return event.defaultPrevented;
      }),
    ).toBe(true);
    release?.();
    await expect(trash).toBeEnabled();
    await expect(
      page.getByText("Tinjau kembali rencana minggu ini", { exact: true }),
    ).toBeVisible();
    await expect(
      page
        .locator("[data-sonner-toast]")
        .filter({ hasText: "Koneksi terputus" }),
    ).toBeVisible();
  } finally {
    release?.();
  }
});
