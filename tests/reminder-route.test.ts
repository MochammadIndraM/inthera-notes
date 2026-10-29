import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  config: vi.fn(),
  repository: vi.fn(),
  send: vi.fn(),
}));
vi.mock("@/lib/reminders/config", () => ({
  reminderEmailConfig: mocks.config,
}));
vi.mock("@/lib/reminders/server", () => ({
  reminderRepository: mocks.repository,
  sendReminderEmail: mocks.send,
}));
import { GET } from "@/app/api/cron/task-reminders/route";
afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetAllMocks();
});
describe("Cron hanya dapat dipanggil pemegang secret", () => {
  it.each([undefined, "Bearer wrong-secret"])(
    "menolak header %s sebelum membuka akses admin DB",
    async (header) => {
      vi.stubEnv("CRON_SECRET", "secret-for-test-at-least-16");
      const response = await GET(
        new Request("https://notes.example.test/api/cron/task-reminders", {
          headers: header ? { authorization: header } : {},
        }),
      );
      expect(response.status).toBe(401);
      expect(mocks.config).not.toHaveBeenCalled();
      expect(mocks.repository).not.toHaveBeenCalled();
      expect(mocks.send).not.toHaveBeenCalled();
    },
  );
  it("tidak menerima secret dari query string", async () => {
    vi.stubEnv("CRON_SECRET", "secret-for-test-at-least-16");
    const response = await GET(
      new Request(
        "https://notes.example.test/api/cron/task-reminders?secret=secret-for-test-at-least-16",
      ),
    );
    expect(response.status).toBe(401);
  });
  it("konfigurasi pengirim yang belum tersedia tidak mengklaim atau mengirim email", async () => {
    vi.stubEnv("CRON_SECRET", "secret-for-test-at-least-16");
    mocks.config.mockReturnValue(null);
    const response = await GET(
      new Request("https://notes.example.test/api/cron/task-reminders", {
        headers: { authorization: "Bearer secret-for-test-at-least-16" },
      }),
    );
    expect(response.status).toBe(503);
    expect(mocks.repository).not.toHaveBeenCalled();
    expect(mocks.send).not.toHaveBeenCalled();
  });
});
