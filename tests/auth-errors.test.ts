import { describe, expect, it } from "vitest";
import { authFailure, authFailureMetadata } from "@/lib/auth-errors";

describe("Pesan kegagalan registrasi dan email", () => {
  it.each(["register", "reset"] as const)(
    "%s menjelaskan batas email tanpa menganggapnya batas jumlah akun",
    (operation) => {
      const result = authFailure(
        { code: "over_email_send_rate_limit", status: 429 },
        operation,
      );
      expect(result.ok).toBe(false);
      expect(result.message).toContain("Batas pengiriman email");
      expect(result.message).not.toContain("jumlah akun");
    },
  );
  it("membedakan alamat yang tidak diizinkan oleh SMTP bawaan", () => {
    expect(
      authFailure({ code: "email_address_not_authorized" }, "register").message,
    ).toContain("Layanan email aplikasi belum mendukung alamat ini");
  });
  it("tidak menyamakan signup nonaktif dengan batas email", () => {
    expect(authFailure({ code: "signup_disabled" }, "register").message).toBe(
      "Pendaftaran akun baru sedang dinonaktifkan.",
    );
  });
  it("HTTP 429 tanpa kode tetap memberi petunjuk percobaan ulang", () => {
    expect(authFailure({ status: 429 }, "register").message).toContain(
      "Terlalu banyak percobaan",
    );
  });
  it("kebijakan password Supabase ditampilkan pada field password", () => {
    expect(
      authFailure({ code: "weak_password" }, "register").errors?.password,
    ).toHaveLength(1);
  });
  it.each([
    "email_exists",
    "user_already_exists",
    "unexpected_failure",
    "constructor",
  ])("%s tidak membocorkan keberadaan akun atau pesan provider", (code) => {
    const result = authFailure(
      {
        code,
        status: 500,
        message: "Private SQL: user@example.test token=SECRET",
      },
      "register",
    );
    const json = JSON.stringify(result);
    expect(typeof result.message).toBe("string");
    expect(json).not.toContain("user@example.test");
    expect(json).not.toContain("SECRET");
    expect(json).not.toContain("Private SQL");
    expect(json).not.toContain(code);
  });
  it("pesan provider tidak ikut metadata log", () => {
    expect(
      authFailureMetadata({
        code: "over_email_send_rate_limit",
        status: 429,
        message: "user@example.test token=SECRET",
      }),
    ).toEqual({ code: "over_email_send_rate_limit", status: 429 });
  });
  it("kode yang tidak valid disanitasi pada metadata log", () => {
    expect(
      authFailureMetadata({ code: "SQL: user@example.test", status: 500 }),
    ).toEqual({ code: "unknown", status: 500 });
  });
});
