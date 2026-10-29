import { afterEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({
  signUp: vi.fn(),
  resetPasswordForEmail: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ auth })),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
import { authenticate } from "@/lib/actions/auth";

function registration() {
  const form = new FormData();
  form.set("display_name", "Pengguna uji");
  form.set("email", "user@example.test");
  form.set("password", "Password-only-for-test-123");
  form.set("confirm_password", "Password-only-for-test-123");
  return form;
}
afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});
describe("Server Action mempertahankan kategori error Auth", () => {
  it("mengembalikan error limit email dari signUp dan log yang aman", async () => {
    const log = vi.spyOn(console, "warn").mockImplementation(() => {});
    auth.signUp.mockResolvedValue({
      data: {},
      error: {
        code: "over_email_send_rate_limit",
        status: 429,
        message: "Private provider error for user@example.test",
      },
    });
    const result = await authenticate("register", registration());
    expect(result.ok).toBe(false);
    expect(result.message).toContain("Batas pengiriman email");
    expect(log).toHaveBeenCalledWith("intheranotes.auth.signup_failed", {
      code: "over_email_send_rate_limit",
      status: 429,
    });
    expect(JSON.stringify(log.mock.calls)).not.toContain("user@example.test");
  });
  it("registrasi yang memerlukan verifikasi tidak dianggap sudah login", async () => {
    auth.signUp.mockResolvedValue({
      data: { session: null },
      error: null,
    });
    const result = await authenticate("register", registration());
    expect(result.ok).toBe(true);
    expect(result.redirectTo).toBeUndefined();
    expect(result.message).toContain("verifikasi");
  });
  it("reset password menggunakan penjelasan limit email yang sama", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://notes.example.test");
    vi.spyOn(console, "warn").mockImplementation(() => {});
    auth.resetPasswordForEmail.mockResolvedValue({
      data: {},
      error: { code: "over_email_send_rate_limit", status: 429 },
    });
    const result = await authenticate("reset", registration());
    expect(result.ok).toBe(false);
    expect(result.message).toContain("Batas pengiriman email");
  });
});
