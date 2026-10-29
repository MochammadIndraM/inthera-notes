import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  upsert: vi.fn(),
  config: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: mocks.getUser },
    from: () => ({ upsert: mocks.upsert }),
  }),
}));
vi.mock("@/lib/reminders/config", () => ({
  reminderEmailConfig: mocks.config,
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
import { saveReminderPreferences } from "@/lib/actions/reminders";
beforeEach(() => {
  mocks.getUser.mockResolvedValue({
    data: {
      user: { id: "owner-a", email_confirmed_at: "2026-10-29T00:00:00Z" },
    },
  });
  mocks.upsert.mockResolvedValue({ error: null });
  mocks.config.mockReturnValue({});
});
afterEach(() => vi.resetAllMocks());
describe("Preferensi pengingat: hanya pemilik dan consent eksplisit", () => {
  it("mengabaikan user_id client dan menyimpan pilihan untuk user login", async () => {
    const form = new FormData();
    form.set("user_id", "owner-b");
    form.set("in_app_enabled", "on");
    form.set("email_enabled", "on");
    expect((await saveReminderPreferences(form)).ok).toBe(true);
    expect(mocks.upsert).toHaveBeenCalledWith(
      { user_id: "owner-a", in_app_enabled: true, email_enabled: true },
      { onConflict: "user_id" },
    );
  });
  it("tidak mengaktifkan email tanpa konfigurasi pengirim", async () => {
    mocks.config.mockReturnValue(null);
    const form = new FormData();
    form.set("email_enabled", "on");
    expect((await saveReminderPreferences(form)).ok).toBe(false);
    expect(mocks.upsert).not.toHaveBeenCalled();
  });
  it("opt-out tetap dapat disimpan ketika layanan email tidak tersedia", async () => {
    mocks.config.mockReturnValue(null);
    const form = new FormData();
    form.set("in_app_enabled", "on");
    expect((await saveReminderPreferences(form)).ok).toBe(true);
    expect(mocks.upsert).toHaveBeenCalledWith(
      { user_id: "owner-a", in_app_enabled: true, email_enabled: false },
      { onConflict: "user_id" },
    );
  });
  it("email belum terverifikasi tidak dapat mengaktifkan pengiriman", async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: { id: "owner-a", email_confirmed_at: null } },
    });
    const form = new FormData();
    form.set("email_enabled", "on");
    expect((await saveReminderPreferences(form)).ok).toBe(false);
    expect(mocks.upsert).not.toHaveBeenCalled();
  });
});
