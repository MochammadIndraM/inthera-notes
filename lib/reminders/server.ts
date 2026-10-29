import "server-only";
import { createClient } from "@supabase/supabase-js";
import { reminderEmailConfig } from "./config";
import type { ReminderRepository } from "./worker";
import type { ReminderDelivery, ReminderEmail } from "./types";

export function reminderRepository(
  config: NonNullable<ReturnType<typeof reminderEmailConfig>>,
): ReminderRepository {
  const client = createClient(config.supabaseUrl, config.serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  async function rpc<T>(
    name: string,
    args: Record<string, unknown> = {},
  ): Promise<T> {
    const { data, error } = await client.rpc(name, args);
    if (error) throw new Error("reminder_database_error");
    return data as T;
  }
  return {
    claim: (run) =>
      rpc<ReminderDelivery[]>("claim_task_reminders", {
        p_run: run,
        p_limit: 10,
      }),
    prepare: (d, email) =>
      rpc<ReminderEmail | null>("prepare_task_reminder", {
        p_id: d.id,
        p_token: d.claim_token,
        p_request: email,
      }),
    finish: (d, state, provider, error) =>
      rpc<boolean>("finish_task_reminder", {
        p_id: d.id,
        p_token: d.claim_token,
        p_state: state,
        p_provider: provider ?? null,
        p_error: error ?? null,
      }),
    pending: () => rpc<number>("pending_task_reminders"),
  };
}
export async function sendReminderEmail(
  apiKey: string,
  email: ReminderEmail,
  key: string,
) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    cache: "no-store",
    signal: AbortSignal.timeout(12000),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": key,
    },
    body: JSON.stringify(email),
  });
  if (!response.ok) throw new Error(`email_http_${response.status}`);
  const data = await response.json();
  if (typeof data.id !== "string") throw new Error("email_invalid_response");
  return { id: data.id };
}
