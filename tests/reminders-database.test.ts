import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { todayWib } from "@/lib/domain";
import type { ReminderDelivery, ReminderEmail } from "@/lib/reminders/types";

const db = new PGlite();
const A = "10000000-0000-4000-8000-000000000001",
  B = "10000000-0000-4000-8000-000000000002",
  C = "10000000-0000-4000-8000-000000000003";
const today = todayWib();
const yesterday = new Date(Date.parse(today) - 86400000)
  .toISOString()
  .slice(0, 10);
const tomorrow = new Date(Date.parse(today) + 86400000)
  .toISOString()
  .slice(0, 10);
async function actor(id: string) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
  await db.exec("set role authenticated");
}
async function service() {
  await db.exec("reset role;set role service_role");
}
async function preference(user: string, enabled = true) {
  await actor(user);
  await db.query(
    "insert into public.task_reminder_preferences(user_id,email_enabled) values($1,$2) on conflict(user_id) do update set email_enabled=excluded.email_enabled",
    [user, enabled],
  );
}
async function task(
  user: string,
  title: string,
  date: string | null = today,
  status = "todo",
) {
  await actor(user);
  return (
    await db.query<{ id: string }>(
      "insert into public.tasks(user_id,title,due_date,status) values($1,$2,$3,$4) returning id",
      [user, title, date, status],
    )
  ).rows[0].id;
}
async function claim(run = randomUUID()) {
  await service();
  return (
    await db.query<{ items: ReminderDelivery[] }>(
      "select public.claim_task_reminders($1,20) items",
      [run],
    )
  ).rows[0].items;
}
async function prepare(
  d: ReminderDelivery,
  text = "Ringkasan",
): Promise<ReminderEmail | null> {
  await service();
  const request = {
    from: "Notes <notes@example.test>",
    to: [d.payload.email],
    subject: "Reminder",
    text,
  };
  return (
    await db.query<{ email: ReminderEmail | null }>(
      "select public.prepare_task_reminder($1,$2,$3) email",
      [d.id, d.claim_token, JSON.stringify(request)],
    )
  ).rows[0].email;
}
async function finish(d: ReminderDelivery, state = "sent") {
  await service();
  return (
    await db.query<{ ok: boolean }>(
      "select public.finish_task_reminder($1,$2,$3,'provider-test','test_error') ok",
      [d.id, d.claim_token, state],
    )
  ).rows[0].ok;
}

beforeAll(async () => {
  await db.exec(`create role anon nologin;create role authenticated nologin;create role service_role nologin bypassrls;
 create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,raw_user_meta_data jsonb default '{}');
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema public,auth to authenticated,anon,service_role;`);
  for (const file of [
    "202610290001_initial.sql",
    "202610290002_task_reminders.sql",
  ])
    await db.exec(await readFile("supabase/migrations/" + file, "utf8"));
});
beforeEach(async () => {
  await db.exec("reset role;truncate auth.users cascade");
  await db.query(
    "insert into auth.users(id,email,email_confirmed_at) values($1,'a@example.test',now()),($2,'b@example.test',now()),($3,'c@example.test',null)",
    [A, B, C],
  );
});
afterAll(async () => db.close());

describe("Pengingat PostgreSQL: consent, kepemilikan, dan tenggat WIB", () => {
  it("preferensi privat dan fungsi worker tidak dapat dipanggil user/anon", async () => {
    await preference(A);
    await preference(B);
    await actor(A);
    expect(
      (await db.query("select * from public.task_reminder_preferences")).rows,
    ).toHaveLength(1);
    expect(
      (
        await db.query(
          "update public.task_reminder_preferences set email_enabled=false where user_id=$1 returning user_id",
          [B],
        )
      ).rows,
    ).toHaveLength(0);
    await expect(
      db.query(
        "insert into public.task_reminder_preferences(user_id) values($1)",
        [C],
      ),
    ).rejects.toThrow();
    await expect(
      db.query("select public.claim_task_reminders($1,20)", [randomUUID()]),
    ).rejects.toThrow();
    await expect(
      db.query(
        "insert into public.task_reminder_deliveries(user_id,reminder_date,payload) values($1,$2,'{}')",
        [A, today],
      ),
    ).rejects.toThrow();
    await db.exec("reset role;set role anon");
    await expect(
      db.query("select * from public.task_reminder_preferences"),
    ).rejects.toThrow();
  });
  it("hanya hari ini/overdue aktif, email opt-in dan terverifikasi", async () => {
    await preference(A);
    await preference(B, false);
    await preference(C);
    await task(A, "Hari ini");
    await task(A, "Terlambat", yesterday, "in_progress");
    await task(A, "Sudah selesai", today, "done");
    await task(A, "Tanpa tenggat", null);
    await task(A, "Besok", tomorrow);
    await task(B, "Tidak opt-in");
    await task(C, "Email belum diverifikasi");
    const rows = await claim();
    expect(rows).toHaveLength(1);
    expect(rows[0].user_id).toBe(A);
    expect(rows[0].payload.due_count).toBe(1);
    expect(rows[0].payload.overdue_count).toBe(1);
    expect(rows[0].payload.tasks.map((t) => t.title)).toEqual([
      "Terlambat",
      "Hari ini",
    ]);
  });
  it("ringkasan A dan B terpisah serta riwayat tetap dilindungi RLS", async () => {
    await preference(A);
    await preference(B);
    await task(A, "Rahasia A");
    await task(B, "Rahasia B");
    const rows = await claim();
    expect(rows).toHaveLength(2);
    expect(
      rows.find((d) => d.user_id === B)!.payload.tasks.map((t) => t.title),
    ).toEqual(["Rahasia B"]);
    await actor(A);
    const history = await db.query<{ user_id: string }>(
      "select user_id from public.task_reminder_deliveries",
    );
    expect(history.rows).toEqual([{ user_id: A }]);
  });
  it("maksimal satu ringkasan per user/hari dan claim bersamaan tidak menggandakan email", async () => {
    await preference(A);
    await task(A, "Tugas");
    const [d] = await claim();
    expect(await claim()).toHaveLength(0);
    expect(await prepare(d)).not.toBeNull();
    expect(await finish(d)).toBe(true);
    expect(await claim()).toHaveLength(0);
  });
  it("opt-out setelah antre dan tugas selesai sebelum dikirim membatalkan email", async () => {
    await preference(A);
    await task(A, "Tugas A");
    const [a] = await claim();
    await preference(A, false);
    expect(await prepare(a)).toBeNull();
    await preference(B);
    const id = await task(B, "Tugas B");
    const [b] = await claim();
    await actor(B);
    await db.query("update public.tasks set status='done' where id=$1", [id]);
    expect(await prepare(b)).toBeNull();
  });
  it("perubahan email/duedate sebelum pengiriman membatalkan payload lama", async () => {
    await preference(A);
    const id = await task(A, "Tugas");
    const [d] = await claim();
    await actor(A);
    await db.query("update public.tasks set due_date=$1 where id=$2", [
      tomorrow,
      id,
    ]);
    expect(await prepare(d)).toBeNull();
  });
  it("retry mempertahankan payload, batas percobaan, dan fencing token", async () => {
    await preference(A);
    await task(A, "Tugas");
    let [d] = await claim();
    const original = await prepare(d, "Versi asli");
    await finish(d, "failed");
    const first = d;
    [d] = await claim();
    expect((await prepare(d, "Versi berbeda"))?.text).toBe(original?.text);
    expect(await finish(first)).toBe(false);
    await finish(d, "failed");
    [d] = await claim();
    await finish(d, "failed");
    expect(await claim()).toHaveLength(0);
  });
  it("satu invocation tidak mengulang email gagal; retry memakai run baru", async () => {
    await preference(A);
    await task(A, "Tugas");
    const run = randomUUID();
    const [d] = await claim(run);
    await prepare(d);
    await finish(d, "failed");
    expect(await claim(run)).toHaveLength(0);
    expect(await claim()).toHaveLength(1);
  });
  it("lease macet bisa diklaim ulang dan token lama tidak dapat menandai sent", async () => {
    await preference(A);
    await task(A, "Tugas");
    const [old] = await claim();
    await service();
    await db.query(
      "update public.task_reminder_deliveries set claimed_at=now()-interval '11 minutes' where id=$1",
      [old.id],
    );
    const [fresh] = await claim();
    expect(fresh.claim_token).not.toBe(old.claim_token);
    expect(await finish(old)).toBe(false);
    expect(await finish(fresh)).toBe(true);
  });
  it("payload hari lalu tidak dikirim ulang di luar window idempotency", async () => {
    await service();
    await db.query(
      "insert into public.task_reminder_deliveries(user_id,reminder_date,payload,state) values($1,$2,'{}','failed')",
      [A, yesterday],
    );
    expect(await claim()).toHaveLength(0);
    expect(
      (
        await db.query<{ state: string }>(
          "select state from public.task_reminder_deliveries",
        )
      ).rows[0].state,
    ).toBe("skipped");
  });
});
