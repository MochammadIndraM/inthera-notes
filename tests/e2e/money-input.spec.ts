import { test, expect } from "@playwright/test";

test("nominal hanya menerima angka, langsung berformat ribuan, dan nyaman diedit", async ({
  page,
}) => {
  test.skip(
    !!process.env.E2E_BASE_URL,
    "Fixture memerlukan server development terisolasi.",
  );
  await page.goto("/dev-preview");
  await page
    .locator(".panel-header")
    .getByRole("button", { name: "Catat transaksi" })
    .click();
  const dialog = page.getByRole("dialog", { name: "Catat transaksi" });
  const input = dialog.getByLabel("Nominal transaksi");
  await input.pressSequentially("sadsads");
  await expect(input).toHaveValue("");
  await input.pressSequentially("200000");
  await expect(input).toHaveValue("200.000");
  await input.press("Backspace");
  await expect(input).toHaveValue("20.000");
  await input.fill("1234");
  await input.evaluate((element: HTMLInputElement) =>
    element.setSelectionRange(2, 2),
  );
  await input.press("Backspace");
  await expect(input).toHaveValue("234");
  await input.fill("1234");
  await input.evaluate((element: HTMLInputElement) =>
    element.setSelectionRange(1, 1),
  );
  await input.press("Delete");
  await expect(input).toHaveValue("134");
  await input.fill("9007199254740993");
  await expect(input).toHaveValue("9.007.199.254.740.993");
  await expect(input).toBeFocused();
  await input.fill("Rp 1.250.000");
  await expect(input).toHaveValue("1.250.000");
  await input.fill("1,5");
  await expect(input).toHaveValue("1.250.000");
  await input.fill("1234567");
  await input.evaluate((element: HTMLInputElement) =>
    element.setSelectionRange(2, 5),
  );
  await input.press("9");
  await expect(input).toHaveValue("19.567");
  expect(
    await input.evaluate((element: HTMLInputElement) =>
      element.checkValidity(),
    ),
  ).toBe(true);
  const submitted = await dialog
    .locator("form")
    .evaluate((form: HTMLFormElement) => new FormData(form).get("amount"));
  expect(submitted).toBe("19.567");
  await input.press("ControlOrMeta+A");
  await input.press("Backspace");
  await expect(input).toHaveValue("");
});
