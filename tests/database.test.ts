import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Summary } from "@/lib/types";

const A = "10000000-0000-4000-8000-000000000001";
const B = "10000000-0000-4000-8000-000000000002";
const db = new PGlite();
async function asUser(id: string) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
  await db.exec("set role authenticated");
}
async function account(user: string, name: string, balance = "0") {
  return (
    await db.query<{ id: string }>(
      "insert into public.financial_accounts(user_id,name,type,opening_balance) values ($1,$2,'cash',$3) returning id",
      [user, name, balance],
    )
  ).rows[0].id;
}
async function category(type = "expense", name = "Makanan & Minuman") {
  return (
    await db.query<{ id: string }>(
      "select id from public.financial_categories where type=$1 and name=$2",
      [type, name],
    )
  ).rows[0].id;
}
async function transaction(
  type: string,
  amount: string,
  accountId: string,
  categoryId: string,
  date = "2026-10-29",
) {
  return (
    await db.query<{ id: string }>(
      "insert into public.financial_transactions(user_id,type,amount,transaction_date,account_id,category_id) values ($1,$2,$3,$4,$5,$6) returning id",
      [A, type, amount, date, accountId, categoryId],
    )
  ).rows[0].id;
}
async function summary(start = "2026-10-01", end = "2026-11-01") {
  return (
    await db.query<{ value: Summary }>(
      "select public.workspace_summary($1,$2) value",
      [start, end],
    )
  ).rows[0].value;
}
async function balances() {
  return (
    await db.query<{ name: string; balance: string }>(
      "select name,balance from public.account_balances order by name",
    )
  ).rows;
}

beforeAll(async () => {
  await db.exec(`create role anon nologin; create role authenticated nologin;
    create schema auth; create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}'::jsonb);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema public,auth to authenticated,anon; grant execute on function auth.uid() to authenticated,anon;`);
  await db.exec(
    await readFile("supabase/migrations/202610290001_initial.sql", "utf8"),
  );
});
beforeEach(async () => {
  await db.exec("reset role; truncate auth.users cascade");
  await db.query(
    'insert into auth.users(id,raw_user_meta_data) values ($1,\'{"display_name":"User A"}\'),($2,\'{"display_name":"User B"}\')',
    [A, B],
  );
  await asUser(A);
});
afterAll(async () => {
  await db.close();
});

describe("Migration dan onboarding nyata di PostgreSQL", () => {
  it("mengaktifkan RLS di seluruh tabel privat dan memberi 15 kategori privat", async () => {
    const { rows } = await db.query<{ relrowsecurity: boolean }>(
      "select relrowsecurity from pg_class where relnamespace='public'::regnamespace and relkind='r'",
    );
    expect(rows).toHaveLength(7);
    expect(rows.every((row) => row.relrowsecurity)).toBe(true);
    expect(
      (await db.query("select * from public.financial_categories")).rows,
    ).toHaveLength(15);
    expect((await db.query("select * from public.profiles")).rows).toHaveLength(
      1,
    );
  });
  it("kategori unik tanpa membedakan kapital dan spasi", async () => {
    await expect(
      db.query(
        "insert into public.financial_categories(user_id,name,type) values ($1,' MAKANAN & MINUMAN ','expense')",
        [A],
      ),
    ).rejects.toThrow();
  });
});
describe("Ledger dan laporan sesuai angka penerimaan PRD", () => {
  async function ledger() {
    const cash = await account(A, "Tunai", "500000");
    const bank = await account(A, "Bank", "1000000");
    const expense = await category();
    const income = await category("income", "Gaji");
    const expenseId = await transaction("expense", "50000", cash, expense);
    await transaction("income", "200000", bank, income);
    await db.query(
      "insert into public.financial_transactions(user_id,type,amount,transaction_date,from_account_id,to_account_id) values ($1,'transfer',100000,'2026-10-29',$2,$3)",
      [A, bank, cash],
    );
    return { cash, bank, expense, expenseId };
  }
  it("Tunai 550.000, Bank 1.100.000, saldo 1.650.000, net +150.000", async () => {
    await ledger();
    expect(await balances()).toEqual([
      { name: "Bank", balance: "1100000" },
      { name: "Tunai", balance: "550000" },
    ]);
    const report = await summary();
    expect(report.balance).toBe("1650000");
    expect(report.income).toBe("200000");
    expect(report.expense).toBe("50000");
    expect(BigInt(report.income) - BigInt(report.expense)).toBe(BigInt(150000));
    expect(report.daily).toHaveLength(31);
    expect(report.categories[0].amount).toBe("50000");
  });
  it("edit dan hapus menghitung saldo dan anggaran ulang, tanpa double counting", async () => {
    const { cash, expense, expenseId } = await ledger();
    await db.query(
      "insert into public.budgets(user_id,category_id,month,limit_amount) values ($1,$2,'2026-10-01',100000)",
      [A, expense],
    );
    await db.query(
      "update public.financial_transactions set amount=75000 where id=$1",
      [expenseId],
    );
    expect((await summary()).balance).toBe("1625000");
    expect(
      (
        await db.query<{ spent: string }>(
          "select spent from public.budget_usage",
        )
      ).rows[0].spent,
    ).toBe("75000");
    await db.query("delete from public.financial_transactions where id=$1", [
      expenseId,
    ]);
    expect((await summary()).balance).toBe("1700000");
    expect((await summary()).expense).toBe("0");
    expect(
      (
        await db.query<{ spent: string }>(
          "select spent from public.budget_usage",
        )
      ).rows[0].spent,
    ).toBe("0");
    await db.query(
      "update public.financial_accounts set is_archived=true where id=$1",
      [cash],
    );
    expect((await summary()).balance).toBe("1700000");
    expect(
      (await db.query("select * from public.financial_transactions")).rows,
    ).toHaveLength(2);
  });
  it("saldo awal dan transfer tidak masuk income/expense/budget, periode memakai DATE", async () => {
    const cash = await account(A, "Tunai", "500000");
    const bank = await account(A, "Bank", "1000000");
    const cat = await category();
    await db.query(
      "insert into public.budgets(user_id,category_id,month,limit_amount) values ($1,$2,'2026-10-01',100000)",
      [A, cat],
    );
    await transaction("expense", "50000", cash, cat, "2026-09-30");
    await transaction("expense", "25000", cash, cat, "2026-11-01");
    await db.query(
      "insert into public.financial_transactions(user_id,type,amount,transaction_date,from_account_id,to_account_id) values ($1,'transfer',100000,'2026-10-01',$2,$3)",
      [A, bank, cash],
    );
    const report = await summary();
    expect(report.income).toBe("0");
    expect(report.expense).toBe("0");
    expect(report.balance).toBe("1425000");
    expect(
      (
        await db.query<{ spent: string }>(
          "select spent from public.budget_usage",
        )
      ).rows[0].spent,
    ).toBe("0");
    await db.query(
      "update public.financial_transactions set transaction_date='2026-10-01' where transaction_date='2026-11-01'",
    );
    expect((await summary()).expense).toBe("25000");
  });
  it("BIGINT melampaui safe integer dikirim sebagai text presisi penuh", async () => {
    const cash = await account(A, "Tunai", "9007199254740993");
    const income = await category("income", "Gaji");
    await transaction("income", "9007199254740993", cash, income);
    expect((await summary()).balance).toBe("18014398509481986");
    expect((await summary()).income).toBe("9007199254740993");
    expect(
      (
        await db.query<{ amount: string }>(
          "select amount from public.transaction_records",
        )
      ).rows[0].amount,
    ).toBe("9007199254740993");
  });
  it("ekspor snapshot tidak terpotong 1.000 baris dan mengikuti filter", async () => {
    const cash = await account(A, "Tunai");
    const cat = await category();
    await db.query(
      "insert into public.financial_transactions(user_id,type,amount,transaction_date,account_id,category_id,title) select $1,'expense',n,'2026-10-29',$2,$3,'Ekspor '||n from generate_series(1,1105) n",
      [A, cash, cat],
    );
    const exported = await db.query<{ value: { rows: { amount: string }[] } }>(
      "select public.export_transactions('2026-10-01','2026-11-01',null,null,null,'','largest') value",
    );
    expect(exported.rows[0].value.rows).toHaveLength(1105);
    expect(exported.rows[0].value.rows[0].amount).toBe("1105");
    const filtered = await db.query<{ value: { rows: unknown[] } }>(
      "select public.export_transactions('2026-10-01','2026-11-01','expense',$1,$2,'Ekspor 1105','') value",
      [cash, cat],
    );
    expect(filtered.rows[0].value.rows).toHaveLength(1);
    await asUser(B);
    const hidden = await db.query<{ value: { rows: unknown[] } }>(
      "select public.export_transactions('2026-10-01','2026-11-01') value",
    );
    expect(hidden.rows[0].value.rows).toHaveLength(0);
  });
});
describe("Keamanan RLS dan relasi lintas pemilik", () => {
  it("A tidak dapat select/update/delete semua jenis data B atau memalsukan user_id", async () => {
    await asUser(B);
    const bank = await account(B, "Bank B");
    const cat = await category();
    const project = (
      await db.query<{ id: string }>(
        "insert into public.projects(user_id,name) values ($1,'Privat B') returning id",
        [B],
      )
    ).rows[0].id;
    const task = (
      await db.query<{ id: string }>(
        "insert into public.tasks(user_id,title,project_id) values ($1,'Rahasia',$2) returning id",
        [B, project],
      )
    ).rows[0].id;
    const tx = (
      await db.query<{ id: string }>(
        "insert into public.financial_transactions(user_id,type,amount,transaction_date,account_id,category_id) values ($1,'expense',100,'2026-10-29',$2,$3) returning id",
        [B, bank, cat],
      )
    ).rows[0].id;
    const budget = (
      await db.query<{ id: string }>(
        "insert into public.budgets(user_id,category_id,month,limit_amount) values ($1,$2,'2026-10-01',1000) returning id",
        [B, cat],
      )
    ).rows[0].id;
    await asUser(A);
    for (const [table, id] of [
      ["projects", project],
      ["tasks", task],
      ["financial_accounts", bank],
      ["financial_categories", cat],
      ["financial_transactions", tx],
      ["budgets", budget],
      ["profiles", B],
    ]) {
      expect(
        (await db.query(`select id from public.${table} where id=$1`, [id]))
          .rows,
      ).toEqual([]);
      expect(
        (
          await db.query(
            `update public.${table} set updated_at=now() where id=$1 returning id`,
            [id],
          )
        ).rows,
      ).toEqual([]);
      expect(
        (
          await db.query(
            `delete from public.${table} where id=$1 returning id`,
            [id],
          )
        ).rows,
      ).toEqual([]);
    }
    for (const view of [
      "account_balances",
      "transaction_records",
      "budget_usage",
    ])
      expect((await db.query(`select id from public.${view}`)).rows).toEqual(
        [],
      );
    await expect(
      db.query("insert into public.tasks(user_id,title) values ($1,'Palsu')", [
        B,
      ]),
    ).rejects.toThrow();
    const own = (
      await db.query<{ id: string }>(
        "insert into public.tasks(user_id,title) values ($1,'Milik A') returning id",
        [A],
      )
    ).rows[0].id;
    await expect(
      db.query("update public.tasks set user_id=$1 where id=$2", [B, own]),
    ).rejects.toThrow();
    expect((await summary()).balance).toBe("0");
  });
  it("menolak transfer ke akun B, kategori B, proyek B, kategori salah jenis", async () => {
    await asUser(B);
    const bankB = await account(B, "Bank B");
    const catB = await category();
    const projectB = (
      await db.query<{ id: string }>(
        "insert into public.projects(user_id,name) values ($1,'Proyek B') returning id",
        [B],
      )
    ).rows[0].id;
    await asUser(A);
    const cash = await account(A, "Tunai");
    const income = await category("income", "Gaji");
    await expect(
      db.query(
        "insert into public.financial_transactions(user_id,type,amount,transaction_date,from_account_id,to_account_id) values ($1,'transfer',100,'2026-10-29',$2,$3)",
        [A, cash, bankB],
      ),
    ).rejects.toThrow();
    await expect(transaction("expense", "100", cash, catB)).rejects.toThrow();
    await expect(transaction("expense", "100", cash, income)).rejects.toThrow();
    await expect(
      db.query(
        "insert into public.tasks(user_id,title,project_id) values ($1,'Palsu',$2)",
        [A, projectB],
      ),
    ).rejects.toThrow();
    await expect(
      db.query(
        "insert into public.budgets(user_id,category_id,month,limit_amount) values ($1,$2,'2026-10-01',100)",
        [A, income],
      ),
    ).rejects.toThrow();
  });
  it("menolak nominal nol/negatif, transfer sama akun, relasi tak lengkap", async () => {
    const cash = await account(A, "Tunai");
    const cat = await category();
    await expect(transaction("expense", "0", cash, cat)).rejects.toThrow();
    await expect(transaction("expense", "-100", cash, cat)).rejects.toThrow();
    await expect(
      db.query(
        "insert into public.financial_transactions(user_id,type,amount,transaction_date,from_account_id,to_account_id) values ($1,'transfer',100,'2026-10-29',$2,$2)",
        [A, cash],
      ),
    ).rejects.toThrow();
    await expect(
      db.query(
        "insert into public.financial_transactions(user_id,type,amount,transaction_date) values ($1,'income',100,'2026-10-29')",
        [A],
      ),
    ).rejects.toThrow();
  });
  it("arsip mempertahankan histori, menolak penggunaan baru, mengizinkan koreksi historis", async () => {
    const cash = await account(A, "Tunai", "1000");
    const cat = await category();
    const id = await transaction("expense", "100", cash, cat);
    await db.query(
      "update public.financial_accounts set is_archived=true where id=$1",
      [cash],
    );
    await db.query(
      "update public.financial_categories set is_archived=true where id=$1",
      [cat],
    );
    await expect(transaction("expense", "100", cash, cat)).rejects.toThrow();
    await db.query(
      "update public.financial_transactions set amount=200 where id=$1",
      [id],
    );
    expect((await summary()).expense).toBe("200");
    await expect(
      db.query("delete from public.financial_accounts where id=$1", [cash]),
    ).rejects.toThrow();
    await expect(
      db.query("delete from public.financial_categories where id=$1", [cat]),
    ).rejects.toThrow();
    await db.query(
      "update public.financial_accounts set is_archived=false where id=$1",
      [cash],
    );
    await db.query(
      "update public.financial_categories set is_archived=false where id=$1",
      [cat],
    );
    await transaction("expense", "100", cash, cat);
  });
  it("anon tidak punya akses tabel, view, maupun RPC privat", async () => {
    await db.exec("reset role; set role anon");
    await expect(db.query("select * from public.tasks")).rejects.toThrow();
    await expect(
      db.query("select * from public.account_balances"),
    ).rejects.toThrow();
    await expect(
      db.query("select public.workspace_summary('2026-10-01','2026-11-01')"),
    ).rejects.toThrow();
  });
});
describe("Status tugas dan proyek", () => {
  it("DB menjaga completed_at, overdue, dan counter WIB", async () => {
    const task = (
      await db.query<{ id: string; completed_at: string | null }>(
        "insert into public.tasks(user_id,title,status,completed_at,due_date) values ($1,'Belajar','todo',now(),(now() at time zone 'Asia/Jakarta')::date-1) returning id,completed_at",
        [A],
      )
    ).rows[0];
    expect(task.completed_at).toBeNull();
    expect((await summary()).overdue).toBe(1);
    await db.query("update public.tasks set status='done' where id=$1", [
      task.id,
    ]);
    expect((await summary()).completed_today).toBe(1);
    expect((await summary()).active_tasks).toBe(0);
    await db.query("update public.tasks set status='todo' where id=$1", [
      task.id,
    ]);
    expect(
      (
        await db.query<{ completed_at: null }>(
          "select completed_at from public.tasks where id=$1",
          [task.id],
        )
      ).rows[0].completed_at,
    ).toBeNull();
    expect((await summary()).active_tasks).toBe(1);
  });
  it("hapus proyek atomic, tugas tetap ada tanpa proyek", async () => {
    const project = (
      await db.query<{ id: string }>(
        "insert into public.projects(user_id,name) values ($1,'Proyek') returning id",
        [A],
      )
    ).rows[0].id;
    await db.query(
      "insert into public.tasks(user_id,title,project_id) values ($1,'Tetap disimpan',$2)",
      [A, project],
    );
    await db.query("select public.delete_project($1)", [project]);
    expect((await db.query("select id from public.projects")).rows).toEqual([]);
    expect(
      (
        await db.query<{ project_id: null }>(
          "select project_id from public.tasks",
        )
      ).rows[0].project_id,
    ).toBeNull();
  });
});
