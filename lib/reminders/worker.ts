import { dateLabel } from "@/lib/domain";
import type { ReminderDelivery, ReminderEmail } from "./types";

export interface ReminderRepository {
  claim(run: string): Promise<ReminderDelivery[]>;
  prepare(
    delivery: ReminderDelivery,
    email: ReminderEmail,
  ): Promise<ReminderEmail | null>;
  finish(
    delivery: ReminderDelivery,
    state: "sent" | "failed",
    provider?: string,
    error?: string,
  ): Promise<boolean>;
  pending(): Promise<number>;
}
export function reminderEmail(
  delivery: ReminderDelivery,
  from: string,
  origin: string,
): ReminderEmail {
  const p = delivery.payload;
  const lines = p.tasks.map(
    (t) =>
      `- ${t.title} (${t.due_date < p.date ? "Terlambat, tenggat" : "Tenggat hari ini,"} ${dateLabel(t.due_date, true)})`,
  );
  return {
    from,
    to: [p.email],
    subject: `Pengingat tugas: ${p.due_count} hari ini, ${p.overdue_count} terlambat`,
    text: [
      `Halo${p.name ? " " + p.name : ""},`,
      "",
      `Ringkasan tugas ${dateLabel(p.date, true)} (WIB).`,
      `${p.due_count} tugas jatuh tempo hari ini dan ${p.overdue_count} tugas sudah terlambat.`,
      "",
      ...lines,
      p.due_count + p.overdue_count > p.tasks.length
        ? "Daftar ini menampilkan 10 tugas pertama."
        : "",
      "",
      `Buka tugas: ${origin}/tasks/today`,
      "",
      `Anda menerima email ini karena mengaktifkan pengingat tugas. Nonaktifkan kapan saja: ${origin}/settings#reminders`,
    ]
      .filter((line) => line !== undefined)
      .join("\n"),
  };
}
export async function runReminderJob(options: {
  repository: ReminderRepository;
  send: (email: ReminderEmail, key: string) => Promise<{ id: string }>;
  run: string;
  from: string;
  origin: string;
  now?: () => number;
  pause?: () => Promise<void>;
  budgetMs?: number;
}) {
  const { repository } = options;
  const now = options.now ?? Date.now;
  const started = now();
  const budget = options.budgetMs ?? 240000;
  const result = { sent: 0, failed: 0, skipped: 0, pending: 0 };
  while (now() - started < budget - 20000) {
    const batch = await repository.claim(options.run);
    if (!batch.length) break;
    for (const delivery of batch) {
      if (now() - started >= budget - 15000) break;
      const email = await repository.prepare(
        delivery,
        reminderEmail(delivery, options.from, options.origin),
      );
      if (!email) {
        result.skipped++;
        continue;
      }
      let response;
      try {
        response = await options.send(
          email,
          `task-reminder/${delivery.user_id}/${delivery.payload.date}`,
        );
      } catch (error) {
        // Only retain a safe machine code. Never log task titles, recipient, or body.
        const code =
          error instanceof Error && /^[a-zA-Z0-9_-]{1,80}$/.test(error.message)
            ? error.message
            : "send_failed";
        await repository.finish(delivery, "failed", undefined, code);
        result.failed++;
      }
      if (response) {
        // If this DB update fails after sending, abort: the same persisted request
        // and provider idempotency key will be reused when the lease is reclaimed.
        const recorded = await repository.finish(delivery, "sent", response.id);
        if (!recorded) throw new Error("delivery_lease_lost");
        result.sent++;
      }
      if (options.pause) await options.pause();
    }
  }
  result.pending = await repository.pending();
  return result;
}
