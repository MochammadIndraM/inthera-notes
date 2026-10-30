import { test, expect } from "@playwright/test";

test("UI pembaruan menunggu penyimpanan dan persetujuan isian belum tersimpan", async ({
  page,
}) => {
  // A controlled waiting worker exercises the UI without deploying a second build.
  await page.addInitScript(() => {
    const nativeRegister = navigator.serviceWorker.register.bind(
      navigator.serviceWorker,
    );
    navigator.serviceWorker.register = async (...args) => {
      const registration = await nativeRegister(...args);
      await navigator.serviceWorker.ready;
      if (!navigator.serviceWorker.controller)
        await new Promise<void>((resolve) =>
          navigator.serviceWorker.addEventListener(
            "controllerchange",
            () => resolve(),
            { once: true },
          ),
        );
      Object.defineProperty(registration, "waiting", {
        value: {
          state: "installed",
          postMessage: () => {
            document.documentElement.dataset.workerUpdateRequested = "true";
          },
        },
      });
      return registration;
    };
  });
  await page.goto("/login");
  const update = page.getByRole("button", { name: "Perbarui aplikasi" });
  await expect(update).toBeVisible();
  await page.locator("form").evaluate((form) => {
    form.dataset.pending = "true";
  });
  await update.click();
  await expect(
    page.getByText("Tunggu sampai proses penyimpanan selesai."),
  ).toBeVisible();
  await expect(page.locator("html")).not.toHaveAttribute(
    "data-worker-update-requested",
  );
  await page.locator("form").evaluate((form) => {
    delete form.dataset.pending;
  });
  await page.getByLabel("Alamat email").fill("unsaved@example.test");
  await update.click();
  const confirmation = page.getByRole("alertdialog", {
    name: "Perbarui aplikasi?",
  });
  await confirmation.getByRole("button", { name: "Lanjut mengedit" }).click();
  await expect(page.locator("html")).not.toHaveAttribute(
    "data-worker-update-requested",
  );
  await update.click();
  await confirmation
    .getByRole("button", { name: "Perbarui dan muat ulang" })
    .click();
  await expect(page.locator("html")).toHaveAttribute(
    "data-worker-update-requested",
    "true",
  );
});
