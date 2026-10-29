"use client";
import { saveProfile } from "@/lib/actions/auth";
import type { Profile } from "@/lib/types";
import { applyTheme } from "./app-shell";
import { Field, MutationForm } from "./ui";

export function SettingsForm({
  profile,
  email,
}: {
  profile: Profile;
  email: string;
}) {
  return (
    <MutationForm
      action={saveProfile}
      onSuccess={(form) => applyTheme(String(form.get("theme")))}
    >
      <Field name="display_name" label="Nama tampilan">
        <input
          name="display_name"
          defaultValue={profile.display_name ?? ""}
          maxLength={80}
          placeholder="Nama panggilanmu"
        />
      </Field>
      <Field name="email" label="Email akun">
        <input type="email" value={email} readOnly />
      </Field>
      <Field name="theme" label="Tampilan">
        <select name="theme" defaultValue={profile.theme}>
          <option value="system">Ikuti sistem</option>
          <option value="light">Terang</option>
          <option value="dark">Gelap</option>
        </select>
      </Field>
      <div className="settings-fixed">
        <span>
          Mata uang<strong>Rupiah (IDR)</strong>
        </span>
        <span>
          Zona waktu<strong>Asia/Jakarta (WIB)</strong>
        </span>
      </div>
    </MutationForm>
  );
}
