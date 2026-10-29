"use server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  authSchema,
  profileSchema,
  registrationSchema,
  validationErrors,
} from "@/lib/validation";
import { safeNext } from "@/lib/domain";
import type { ActionResult } from "@/lib/types";
import { revalidatePath } from "next/cache";
import { authFailure, authFailureMetadata } from "@/lib/auth-errors";

export async function authenticate(
  mode: "login" | "register" | "reset" | "password",
  form: FormData,
): Promise<ActionResult> {
  const raw = Object.fromEntries(form);
  const schema =
    mode === "register"
      ? registrationSchema
      : mode === "reset"
        ? z.object({ email: z.email("Email tidak valid.") })
        : mode === "password"
          ? z
              .object({
                password: authSchema.shape.password,
                confirm_password: z.string(),
              })
              .refine((v) => v.password === v.confirm_password, {
                path: ["confirm_password"],
                message: "Konfirmasi password tidak sama.",
              })
          : authSchema;
  const parsed = schema.safeParse(raw);
  if (!parsed.success)
    return {
      ok: false,
      message: "Periksa isian Anda.",
      errors: validationErrors(parsed.error),
    };
  const client = await createClient();
  if (mode === "reset") {
    const origin = process.env.NEXT_PUBLIC_APP_URL;
    if (!origin)
      return {
        ok: false,
        message: "Pemulihan belum dikonfigurasi. Hubungi pemilik aplikasi.",
      };
    const { error } = await client.auth.resetPasswordForEmail(
      String(raw.email),
      { redirectTo: origin + "/auth/callback?next=/reset-password" },
    );
    if (error) {
      console.warn(
        "intheranotes.auth.reset_failed",
        authFailureMetadata(error),
      );
      return authFailure(error, "reset");
    }
    return {
      ok: true,
      message:
        "Jika email terdaftar, tautan pemulihan akan dikirim. Periksa kotak masuk.",
    };
  }
  if (mode === "password") {
    const {
      data: { user },
    } = await client.auth.getUser();
    if (!user)
      return {
        ok: false,
        message: "Tautan kedaluwarsa. Minta tautan pemulihan baru.",
      };
    const { error } = await client.auth.updateUser({
      password: String(raw.password),
    });
    return error
      ? {
          ok: false,
          message:
            "Password belum dapat diperbarui. Gunakan tautan pemulihan yang baru.",
        }
      : {
          ok: true,
          message: "Password berhasil diperbarui.",
          redirectTo: "/dashboard",
        };
  }
  const credentials = {
    email: String(raw.email).trim(),
    password: String(raw.password),
  };
  if (mode === "register") {
    const { data, error } = await client.auth.signUp({
      ...credentials,
      options: {
        data: { display_name: String(raw.display_name).trim() },
        ...(process.env.NEXT_PUBLIC_APP_URL
          ? {
              emailRedirectTo:
                process.env.NEXT_PUBLIC_APP_URL + "/auth/callback",
            }
          : {}),
      },
    });
    if (error) {
      console.warn(
        "intheranotes.auth.signup_failed",
        authFailureMetadata(error),
      );
      return authFailure(error, "register");
    }
    return data.session
      ? {
          ok: true,
          message: "Selamat datang di IntheraNotes.",
          redirectTo: "/dashboard",
        }
      : {
          ok: true,
          message:
            "Periksa email untuk verifikasi akun sebelum masuk. Jika sudah terdaftar, silakan masuk.",
        };
  }
  const { error } = await client.auth.signInWithPassword(credentials);
  return error
    ? {
        ok: false,
        message:
          "Email atau password tidak sesuai, atau email belum diverifikasi.",
      }
    : {
        ok: true,
        message: "Berhasil masuk.",
        redirectTo: safeNext(form.get("next")),
      };
}

export async function signOut(): Promise<ActionResult> {
  const client = await createClient();
  const { error } = await client.auth.signOut();
  return error
    ? { ok: false, message: "Belum dapat keluar. Coba kembali." }
    : { ok: true, message: "Anda telah keluar.", redirectTo: "/login" };
}

export async function saveProfile(form: FormData): Promise<ActionResult> {
  const parsed = profileSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return {
      ok: false,
      message: "Periksa isian profil.",
      errors: validationErrors(parsed.error),
    };
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user)
    return {
      ok: false,
      message: "Sesi berakhir. Silakan masuk kembali.",
      redirectTo: "/login",
    };
  const { error } = await client
    .from("profiles")
    .update(parsed.data)
    .eq("id", user.id);
  if (error)
    return { ok: false, message: "Profil belum tersimpan. Coba kembali." };
  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return { ok: true, message: "Preferensi berhasil disimpan." };
}
