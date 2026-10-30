import { createClient } from "@supabase/supabase-js";
import { test, expect } from "@playwright/test";
import { monthRange, todayWib } from "../../lib/domain";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const email = process.env.E2E_TEST_EMAIL;
const password = process.env.E2E_TEST_PASSWORD;
const configured = !!(url && key && email && password);

test("route privat tanpa sesi diarahkan ke login", async ({ page }) => {
  test.skip(!url || !key, "Perlu backend Supabase yang dikonfigurasi.");
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login$/);
});

test.describe("MVP dengan backend Supabase asli", () => {
  test.skip(
    !configured,
    "Isi Supabase env serta E2E_TEST_EMAIL/E2E_TEST_PASSWORD dengan akun test terverifikasi.",
  );
  test("login, persistensi tugas, ledger, edit, hapus, dan logout", async ({
    page,
  }) => {
    const suffix = Date.now().toString(36);
    const taskTitle = "E2E tugas " + suffix;
    const cashName = "E2E Tunai " + suffix;
    const bankName = "E2E Bank " + suffix;
    const labels = [
      "E2E keluar " + suffix,
      "E2E masuk " + suffix,
      "E2E transfer " + suffix,
    ];
    const client = createClient(url!, key!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const auth = await client.auth.signInWithPassword({
      email: email!,
      password: password!,
    });
    expect(auth.error).toBeNull();
    const userId = auth.data.user!.id;
    const range = monthRange(todayWib().slice(0, 7));
    const baseline = await client.rpc("workspace_summary", {
      p_start: range.start,
      p_end: range.end,
    });
    expect(baseline.error).toBeNull();
    try {
      await page.goto("/login");
      await page.getByLabel("Alamat email").fill(email!);
      await page.getByLabel("Password", { exact: true }).fill(password!);
      await page.getByRole("button", { name: "Masuk ke workspace" }).click();
      await expect(page).toHaveURL(/\/dashboard$/);
      await page.goto("/tasks");
      await page
        .locator(".heading-actions")
        .getByRole("button", { name: "Tambah tugas" })
        .click();
      let dialog = page.getByRole("dialog", { name: "Tambah tugas" });
      await dialog.getByLabel("Apa yang ingin diselesaikan?").fill(taskTitle);
      await dialog.getByRole("button", { name: "Simpan", exact: true }).click();
      await expect(dialog).not.toBeVisible();
      await page
        .getByRole("button", { name: "Selesaikan: " + taskTitle, exact: true })
        .click();
      await expect(
        page.getByRole("button", {
          name: "Buka kembali: " + taskTitle,
          exact: true,
        }),
      ).toBeVisible();
      await page.reload();
      await expect(
        page.getByRole("button", {
          name: "Buka kembali: " + taskTitle,
          exact: true,
        }),
      ).toBeVisible();
      await page
        .getByRole("button", {
          name: "Buka kembali: " + taskTitle,
          exact: true,
        })
        .click();
      await expect(
        page.getByRole("button", {
          name: "Selesaikan: " + taskTitle,
          exact: true,
        }),
      ).toBeVisible();
      async function makeAccount(name: string, opening: string) {
        await page.goto("/finance/accounts");
        await page
          .locator(".heading-actions")
          .getByRole("button", { name: "Buat akun keuangan" })
          .click();
        const form = page.getByRole("dialog", { name: "Buat akun keuangan" });
        await form.getByLabel("Nama akun").fill(name);
        await form.getByLabel("Saldo awal").fill(opening);
        await form.getByRole("button", { name: "Simpan", exact: true }).click();
        await expect(form).not.toBeVisible();
      }
      await makeAccount(cashName, "500000");
      await makeAccount(bankName, "1000000");
      async function makeTransaction(
        type: "expense" | "income" | "transfer",
        amount: string,
        title: string,
      ) {
        await page.goto("/finance/transactions");
        await page
          .locator(".heading-actions")
          .getByRole("button", { name: "Catat transaksi" })
          .click();
        const form = page.getByRole("dialog", { name: "Catat transaksi" });
        await form
          .getByRole("button", {
            name:
              type === "expense"
                ? "Pengeluaran"
                : type === "income"
                  ? "Pemasukan"
                  : "Transfer",
            exact: true,
          })
          .click();
        await form.getByLabel("Nominal transaksi").fill(amount);
        if (type === "transfer") {
          await form.getByLabel("Dari akun").selectOption({ label: bankName });
          await form.getByLabel("Ke akun").selectOption({ label: cashName });
        } else {
          await form
            .getByLabel("Akun", { exact: true })
            .selectOption({ label: type === "expense" ? cashName : bankName });
          await form.getByLabel("Kategori", { exact: true }).selectOption({
            label: type === "expense" ? "Makanan & Minuman" : "Gaji",
          });
        }
        await form.getByLabel("Judul / catatan singkat").fill(title);
        await form.getByRole("button", { name: "Simpan", exact: true }).click();
        await expect(form).not.toBeVisible();
      }
      await makeTransaction("expense", "50000", labels[0]);
      await makeTransaction("income", "200000", labels[1]);
      await makeTransaction("transfer", "100000", labels[2]);
      await page.goto("/finance/accounts");
      const cash = page.locator(".account-card").filter({
        has: page.getByRole("heading", { name: cashName, exact: true }),
      });
      const bank = page.locator(".account-card").filter({
        has: page.getByRole("heading", { name: bankName, exact: true }),
      });
      await expect(cash.locator(".account-balance")).toHaveText(/550\.000/);
      await expect(bank.locator(".account-balance")).toHaveText(/1\.100\.000/);
      const checkSummary = await client.rpc("workspace_summary", {
        p_start: range.start,
        p_end: range.end,
      });
      // Compare changes to the actual test account baseline, rather than assuming an empty account.
      expect(
        BigInt(checkSummary.data.balance) - BigInt(baseline.data.balance),
      ).toBe(BigInt(1650000));
      expect(
        BigInt(checkSummary.data.income) - BigInt(baseline.data.income),
      ).toBe(BigInt(200000));
      expect(
        BigInt(checkSummary.data.expense) - BigInt(baseline.data.expense),
      ).toBe(BigInt(50000));
      await page.goto(
        "/finance/transactions?q=" + encodeURIComponent(labels[0]),
      );
      const row = page
        .locator(".transaction-row")
        .filter({ hasText: labels[0] });
      await row.getByRole("button", { name: "Ubah", exact: true }).click();
      dialog = page.getByRole("dialog", { name: "Ubah transaksi" });
      await dialog.getByLabel("Nominal transaksi").fill("75000");
      await dialog.getByRole("button", { name: "Simpan", exact: true }).click();
      await expect(dialog).not.toBeVisible();
      await expect(row.locator(".transaction-amount")).toContainText("75.000");
      await row
        .getByRole("button", { name: "Hapus " + labels[0], exact: true })
        .click();
      await page
        .getByRole("alertdialog", { name: "Hapus data?" })
        .getByRole("button", { name: "Ya, hapus data" })
        .click();
      await expect(row).toHaveCount(0);
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto("/finance/accounts");
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.getByRole("button", { name: "Buka menu" }).click();
      await page
        .getByRole("dialog", { name: "Menu seluler" })
        .getByRole("button", { name: "Keluar", exact: true })
        .click();
      await expect(page).toHaveURL(/\/login$/);
    } finally {
      await client
        .from("financial_transactions")
        .delete()
        .eq("user_id", userId)
        .in("title", labels);
      await client
        .from("tasks")
        .delete()
        .eq("user_id", userId)
        .eq("title", taskTitle);
      await client
        .from("financial_accounts")
        .delete()
        .eq("user_id", userId)
        .in("name", [cashName, bankName]);
      await client.auth.signOut();
    }
  });
});
