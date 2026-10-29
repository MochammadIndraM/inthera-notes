"use client";
import Link from "next/link";
import { authenticate } from "@/lib/actions/auth";
import { MutationForm, Field } from "./ui";
import { PasswordInput } from "./password-input";

export function AuthForm({
  mode,
  next = "/dashboard",
}: {
  mode: "login" | "register" | "reset" | "password";
  next?: string;
}) {
  return (
    <MutationForm
      action={authenticate.bind(null, mode)}
      submit={
        {
          login: "Masuk ke workspace",
          register: "Buat akun gratis",
          reset: "Kirim tautan pemulihan",
          password: "Perbarui password",
        }[mode]
      }
    >
      <input type="hidden" name="next" value={next} />
      {mode === "register" && (
        <Field label="Nama tampilan" name="display_name">
          <input
            name="display_name"
            autoComplete="nickname"
            maxLength={80}
            placeholder="Nama panggilanmu"
          />
        </Field>
      )}
      {mode !== "password" && (
        <Field label="Alamat email" name="email">
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            autoFocus
            maxLength={254}
            placeholder="nama@email.com"
          />
        </Field>
      )}
      {mode !== "reset" && (
        <Field label="Password" name="password">
          <PasswordInput
            name="password"
            autoComplete={
              mode === "login" ? "current-password" : "new-password"
            }
            required
            minLength={8}
            maxLength={128}
            placeholder="Minimal 8 karakter"
          />
        </Field>
      )}
      {(mode === "register" || mode === "password") && (
        <Field label="Konfirmasi password" name="confirm_password">
          <PasswordInput
            name="confirm_password"
            visibilityLabel="konfirmasi password"
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={128}
            placeholder="Ulangi password"
          />
        </Field>
      )}
      {mode === "login" && (
        <Link href="/forgot-password" className="text-link forgot-link">
          Lupa password?
        </Link>
      )}
    </MutationForm>
  );
}
