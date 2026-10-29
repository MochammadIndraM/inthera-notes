"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { reminderEmailConfig } from "@/lib/reminders/config";
import type { ActionResult } from "@/lib/types";

export async function saveReminderPreferences(
  form: FormData,
): Promise<ActionResult> {
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
  const email = form.get("email_enabled") === "on";
  if (email && !reminderEmailConfig())
    return {
      ok: false,
      message: "Email pengingat belum tersedia. Hubungi pengelola aplikasi.",
    };
  if (email && !user.email_confirmed_at)
    return {
      ok: false,
      message:
        "Verifikasi email akun Anda sebelum mengaktifkan pengingat email.",
    };
  const { error } = await client.from("task_reminder_preferences").upsert(
    {
      user_id: user.id,
      in_app_enabled: form.get("in_app_enabled") === "on",
      email_enabled: email,
    },
    { onConflict: "user_id" },
  );
  if (error)
    return {
      ok: false,
      message: ["42P01", "PGRST205"].includes(error.code)
        ? "Penyimpanan pengingat belum disiapkan. Hubungi pengelola aplikasi."
        : "Preferensi belum tersimpan. Periksa koneksi dan coba kembali.",
    };
  revalidatePath("/", "layout");
  return { ok: true, message: "Preferensi pengingat disimpan." };
}
