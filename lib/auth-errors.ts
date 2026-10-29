import type { ActionResult } from "./types";

type AuthFailure = { code?: string; status?: number; message?: string };
export type AuthOperation = "register" | "reset";

const messages: Record<string, string> = {
  over_email_send_rate_limit:
    "Batas pengiriman email aplikasi sedang tercapai. Tunggu beberapa saat sebelum mencoba lagi.",
  over_request_rate_limit:
    "Terlalu banyak percobaan. Tunggu beberapa menit sebelum mencoba lagi.",
  email_address_not_authorized:
    "Layanan email aplikasi belum mendukung alamat ini. Hubungi pengelola aplikasi untuk mengaktifkan pengiriman email.",
  signup_disabled: "Pendaftaran akun baru sedang dinonaktifkan.",
  email_provider_disabled: "Pendaftaran melalui email sedang tidak tersedia.",
  email_address_invalid:
    "Alamat email ini tidak dapat digunakan. Gunakan alamat email yang aktif.",
  weak_password:
    "Password belum memenuhi kebijakan keamanan. Gunakan password yang lebih kuat.",
  captcha_failed:
    "Verifikasi keamanan belum berhasil. Coba kembali atau hubungi pengelola aplikasi.",
  request_timeout: "Layanan belum merespons. Coba kembali beberapa saat lagi.",
};

export function authFailure(
  error: AuthFailure,
  operation: AuthOperation,
): ActionResult {
  const message =
    (error.code && Object.hasOwn(messages, error.code)
      ? messages[error.code]
      : undefined) ||
    (error.status === 429
      ? messages.over_request_rate_limit
      : operation === "register"
        ? "Pendaftaran belum dapat diproses. Jika Anda sudah memiliki akun, silakan masuk atau gunakan pemulihan password. Jika belum, coba kembali atau hubungi pengelola aplikasi."
        : "Permintaan belum dapat diproses. Coba kembali nanti atau hubungi pengelola aplikasi.");
  return {
    ok: false,
    message,
    ...(error.code === "weak_password"
      ? { errors: { password: [messages.weak_password] } }
      : {}),
  };
}

// Log only diagnostic metadata; never include the raw provider message, input,
// email, password, token, or account existence in public error messages.
export function authFailureMetadata(error: AuthFailure) {
  return {
    code:
      error.code && /^[a-z0-9_]{1,80}$/.test(error.code)
        ? error.code
        : "unknown",
    status: error.status,
  };
}
