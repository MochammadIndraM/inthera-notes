"use client";
import { Bell, Mail } from "lucide-react";
import type { ReminderState } from "@/lib/reminders/types";
import { saveReminderPreferences } from "@/lib/actions/reminders";
import { MutationForm } from "./ui";

export function ReminderSettings({
  state,
  emailReady,
  emailVerified,
  email,
}: {
  state: ReminderState;
  emailReady: boolean;
  emailVerified: boolean;
  email: string;
}) {
  if (state.migrationRequired || state.unavailable)
    return (
      <p className="notice warning">
        Pengaturan pengingat belum tersedia. Hubungi pengelola aplikasi untuk
        menyiapkan penyimpanan atau coba muat ulang halaman.
      </p>
    );
  return (
    <MutationForm action={saveReminderPreferences} submit="Simpan pengingat">
      <label className="reminder-option">
        <Bell size={21} />
        <span>
          <strong>Pengingat di aplikasi</strong>
          <small>
            Tampilkan ikon lonceng untuk tugas hari ini dan tugas terlambat.
          </small>
        </span>
        <input
          type="checkbox"
          name="in_app_enabled"
          defaultChecked={state.preferences.in_app_enabled}
        />
      </label>
      <label className="reminder-option">
        <Mail size={21} />
        <span>
          <strong>Email ringkasan pagi</strong>
          <small>
            Satu email setiap hari sekitar pukul 08.00 WIB, hanya jika ada tugas
            yang perlu diingatkan.
          </small>
        </span>
        <input
          type="checkbox"
          name="email_enabled"
          defaultChecked={state.preferences.email_enabled}
          disabled={
            (!emailReady || !emailVerified) && !state.preferences.email_enabled
          }
        />
      </label>
      {!emailVerified ? (
        <p className="notice warning">
          Verifikasi email Anda terlebih dahulu untuk menerima pengingat.
        </p>
      ) : !emailReady ? (
        <p className="notice">
          Email pengingat belum diaktifkan oleh pengelola aplikasi. Pengingat di
          aplikasi tetap dapat digunakan.
        </p>
      ) : (
        <p className="field-hint">
          Dikirim ke {email}. Tugas selesai dan tugas tanpa tenggat tidak
          disertakan. Matikan pilihan email untuk berhenti menerima ringkasan.
        </p>
      )}
    </MutationForm>
  );
}
