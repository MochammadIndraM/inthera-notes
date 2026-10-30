import { expect, test, type Locator } from "@playwright/test";

const configured = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
);

async function expectEyeInside(input: Locator) {
  const position = await input.evaluate((element) => {
    const button = element.parentElement!.querySelector("button")!;
    const field = element.getBoundingClientRect();
    const eye = button.getBoundingClientRect();
    return {
      inside:
        eye.left >= field.left &&
        eye.right <= field.right &&
        eye.top >= field.top &&
        eye.bottom <= field.bottom,
      rightGap: field.right - eye.right,
      centerOffset: Math.abs(
        field.top + field.height / 2 - (eye.top + eye.height / 2),
      ),
      paddingRight: parseFloat(getComputedStyle(element).paddingRight),
      buttonWidth: eye.width,
      buttonType: button.type,
    };
  });
  expect(position.inside).toBe(true);
  expect(position.rightGap).toBeLessThanOrEqual(8);
  expect(position.centerOffset).toBeLessThanOrEqual(1);
  expect(position.paddingRight).toBeGreaterThan(position.buttonWidth);
  expect(position.buttonType).toBe("button");
}

for (const route of ["login", "register"]) {
  for (const width of [320, 390, 1440]) {
    test(`ikon mata di dalam input ${route} pada ${width}px meski CSS tidak termuat`, async ({
      page,
    }) => {
      test.skip(!configured, "Form Auth memerlukan konfigurasi Supabase.");
      await page.setViewportSize({ width, height: 900 });
      let posts = 0;
      page.on("request", (request) => {
        if (request.method() === "POST") posts++;
      });
      await page.goto("/" + route);
      const labels =
        route === "register"
          ? ["Password", "Konfirmasi password"]
          : ["Password"];
      for (const label of labels) {
        const input = page.getByLabel(label, { exact: true });
        await expect(input).toHaveAttribute("type", "password");
        await expectEyeInside(input);
        await input.fill("Contoh-pengujian-123!");
        const button = input.locator("..").getByRole("button");
        await expect(button).toHaveAttribute("aria-label", /^Tampilkan /);
        await expect(button).toHaveAttribute("aria-pressed", "false");
        await expect(button.locator("svg.lucide-eye-off")).toHaveCount(1);
        await button.click();
        await expect(input).toHaveAttribute("type", "text");
        await expect(input).toHaveValue("Contoh-pengujian-123!");
        await expect(button).toHaveAttribute("aria-label", /^Sembunyikan /);
        await expect(button).toHaveAttribute("aria-pressed", "true");
        await expect(button.locator("svg.lucide-eye")).toHaveCount(1);
        await expect(button.locator("svg.lucide-eye-off")).toHaveCount(0);
        await button.press("Space");
        await expect(input).toHaveAttribute("type", "password");
        await expect(button.locator("svg.lucide-eye-off")).toHaveCount(1);
      }
      await page.evaluate(() => {
        for (const sheet of Array.from(document.styleSheets))
          sheet.disabled = true;
      });
      for (const label of labels)
        await expectEyeInside(page.getByLabel(label, { exact: true }));
      expect(posts).toBe(0);
    });
  }
}
