import { describe, expect, it, vi } from "vitest";
import {
  reminderEmail,
  runReminderJob,
  type ReminderRepository,
} from "@/lib/reminders/worker";
import type { ReminderDelivery, ReminderEmail } from "@/lib/reminders/types";
const delivery: ReminderDelivery = {
  id: "delivery",
  user_id: "owner",
  claim_token: "lease",
  email_request: null,
  payload: {
    email: "owner@example.test",
    name: "Pengguna",
    date: "2026-10-29",
    due_count: 1,
    overdue_count: 1,
    tasks: [
      { id: "task-a", title: "Hari ini", due_date: "2026-10-29" },
      { id: "task-b", title: "Terlambat", due_date: "2026-10-28" },
    ],
  },
};
function repository(): ReminderRepository {
  return {
    claim: vi.fn().mockResolvedValueOnce([delivery]).mockResolvedValue([]),
    prepare: vi.fn(async (_d, email) => email),
    finish: vi.fn(async () => true),
    pending: vi.fn(async () => 0),
  };
}
describe("Email digest dan retry tanpa pengiriman sungguhan", () => {
  it("satu email berisi due/overdue dan tautan berhenti berlangganan", () => {
    const email = reminderEmail(
      delivery,
      "Notes <notes@example.test>",
      "https://notes.example.test",
    );
    expect(email.to).toEqual(["owner@example.test"]);
    expect(email.text).toContain("Terlambat, tenggat");
    expect(email.text).toContain("/settings#reminders");
    expect(email.text).toContain("/tasks/today");
    expect(email.subject).toContain("1 hari ini, 1 terlambat");
  });
  it("pengiriman menggunakan key user/tanggal, lalu mencatat provider id", async () => {
    const repo = repository();
    const send = vi.fn<
      (email: ReminderEmail, key: string) => Promise<{ id: string }>
    >(async () => ({ id: "provider-id" }));
    const result = await runReminderJob({
      repository: repo,
      send,
      run: "run",
      from: "notes@example.test",
      origin: "https://notes.example.test",
    });
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][1]).toBe("task-reminder/owner/2026-10-29");
    expect(repo.finish).toHaveBeenCalledWith(delivery, "sent", "provider-id");
    expect(result.sent).toBe(1);
  });
  it("email yang dibatalkan oleh DB tidak pernah dikirim", async () => {
    const repo = repository();
    vi.mocked(repo.prepare).mockResolvedValue(null);
    const send = vi.fn();
    const result = await runReminderJob({
      repository: repo,
      send,
      run: "run",
      from: "notes@example.test",
      origin: "https://notes.example.test",
    });
    expect(send).not.toHaveBeenCalled();
    expect(result.skipped).toBe(1);
  });
  it("error provider disanitasi dan tidak dianggap sent", async () => {
    const repo = repository();
    const send = vi.fn(async () => {
      throw new Error("Private email: owner@example.test, token=SECRET");
    });
    const result = await runReminderJob({
      repository: repo,
      send,
      run: "run",
      from: "notes@example.test",
      origin: "https://notes.example.test",
    });
    expect(repo.finish).toHaveBeenCalledWith(
      delivery,
      "failed",
      undefined,
      "send_failed",
    );
    expect(result.failed).toBe(1);
    expect(result.sent).toBe(0);
  });
  it("DB gagal setelah send menghentikan worker supaya tidak mengklaim keberhasilan palsu", async () => {
    const repo = repository();
    vi.mocked(repo.finish).mockRejectedValue(new Error("db_failed"));
    await expect(
      runReminderJob({
        repository: repo,
        send: async () => ({ id: "sent" }),
        run: "run",
        from: "notes@example.test",
        origin: "https://notes.example.test",
      }),
    ).rejects.toThrow("db_failed");
  });
});
