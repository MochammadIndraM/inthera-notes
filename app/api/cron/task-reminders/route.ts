import { randomUUID, timingSafeEqual } from "node:crypto";
import { reminderEmailConfig } from "@/lib/reminders/config";
import { reminderRepository, sendReminderEmail } from "@/lib/reminders/server";
import { runReminderJob } from "@/lib/reminders/worker";

export const runtime = "nodejs";
export const maxDuration = 300;
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  const actual = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret ?? ""}`);
  if (
    !secret ||
    secret.length < 16 ||
    actual.length !== expected.length ||
    !timingSafeEqual(actual, expected)
  )
    return Response.json(
      { error: "Unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  const config = reminderEmailConfig();
  if (!config)
    return Response.json(
      { error: "Reminder email is not configured" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  try {
    const result = await runReminderJob({
      repository: reminderRepository(config),
      run: randomUUID(),
      from: config.from,
      origin: config.origin,
      send: (email, key) => sendReminderEmail(config.apiKey, email, key),
      pause: () => new Promise((resolve) => setTimeout(resolve, 600)),
    });
    return Response.json(result, {
      status: result.failed || result.pending ? 503 : 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    console.warn("intheranotes.reminders.job_failed");
    return Response.json(
      {
        error:
          "Reminder delivery could not be completed. Check configuration and retry.",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
