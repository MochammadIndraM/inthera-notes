import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

const db = new PGlite();
const A = "10000000-0000-4000-8000-000000000001";
const B = "10000000-0000-4000-8000-000000000002";
async function actor(user = A) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [user]);
  await db.exec("set role authenticated");
}
async function account(amount = "100000", name = "Tunai") {
  return (
    await db.query<{ id: string }>(
      "insert into public.financial_accounts(user_id,name,type,opening_balance) values($1,$2,'cash',$3) returning id",
      [A, name, amount],
    )
  ).rows[0].id;
}
async function tx(
  type: "income" | "expense",
  amount: string,
  accountId: string,
) {
  return (
    await db.query<{ id: string }>(
      `insert into public.financial_transactions(user_id,type,amount,transaction_date,account_id,category_id)
    values($1,$2,$3,'2026-10-30',$4,(select id from public.financial_categories where user_id=$1 and type=$2 limit 1)) returning id`,
      [A, type, amount, accountId],
    )
  ).rows[0].id;
}
async function transfer(amount: string, from: string, to: string) {
  return (
    await db.query<{ id: string }>(
      "insert into public.financial_transactions(user_id,type,amount,transaction_date,from_account_id,to_account_id) values($1,'transfer',$2,'2026-10-30',$3,$4) returning id",
      [A, amount, from, to],
    )
  ).rows[0].id;
}
async function balance(id: string) {
  return (
    await db.query<{ balance: string }>(
      "select balance from public.account_balances where id=$1",
      [id],
    )
  ).rows[0].balance;
}
beforeAll(async () => {
  await db.exec(`create role anon nologin;create role authenticated nologin;create role service_role nologin bypassrls;
    create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema public,auth to authenticated,anon;`);
  for (const path of [
    "202610290001_initial.sql",
    "202610290002_task_reminders.sql",
    "202610300001_sufficient_balance.sql",
  ])
    await db.exec(await readFile("supabase/migrations/" + path, "utf8"));
});
beforeEach(async () => {
  await db.exec("reset role;truncate auth.users cascade");
  await db.query("insert into auth.users(id) values($1),($2)", [A, B]);
  await actor();
});
afterAll(async () => {
  await db.close();
});

describe("Saldo cukup ditegakkan database untuk semua jalur ledger", () => {
  it("saldo 100k menolak expense 200k tanpa mengubah data", async () => {
    const cash = await account();
    await expect(tx("expense", "200000", cash)).rejects.toMatchObject({
      code: "P1001",
    });
    expect(await balance(cash)).toBe("100000");
    expect(
      (await db.query("select * from public.financial_transactions")).rows,
    ).toHaveLength(0);
  });
  it("mengizinkan pengeluaran tepat sebesar saldo hingga nol", async () => {
    const cash = await account();
    await tx("expense", "100000", cash);
    expect(await balance(cash)).toBe("0");
  });
  it("transfer memeriksa sumber dan tidak mengubah tujuan jika gagal", async () => {
    const cash = await account();
    const bank = await account("50000", "Bank");
    await expect(transfer("200000", cash, bank)).rejects.toMatchObject({
      code: "P1001",
    });
    expect(await balance(cash)).toBe("100000");
    expect(await balance(bank)).toBe("50000");
    await transfer("100000", cash, bank);
    expect(await balance(cash)).toBe("0");
    expect(await balance(bank)).toBe("150000");
  });
  it("edit expense mengembalikan efek lama sebelum memeriksa nominal baru", async () => {
    const cash = await account();
    const id = await tx("expense", "80000", cash);
    await db.query(
      "update public.financial_transactions set amount=90000 where id=$1",
      [id],
    );
    expect(await balance(cash)).toBe("10000");
    await expect(
      db.query(
        "update public.financial_transactions set amount=110000 where id=$1",
        [id],
      ),
    ).rejects.toMatchObject({ code: "P1001" });
    expect(await balance(cash)).toBe("10000");
  });
  it("mengganti akun expense memeriksa akun baru dan rollback akun lama", async () => {
    const cash = await account("500000");
    const bank = await account("100000", "Bank");
    const id = await tx("expense", "300000", cash);
    await expect(
      db.query(
        "update public.financial_transactions set account_id=$1 where id=$2",
        [bank, id],
      ),
    ).rejects.toMatchObject({ code: "P1001" });
    expect(await balance(cash)).toBe("200000");
    expect(await balance(bank)).toBe("100000");
  });
  it("menolak hapus atau kurangi pemasukan yang dananya sudah digunakan", async () => {
    const cash = await account("0");
    const id = await tx("income", "100000", cash);
    await tx("expense", "80000", cash);
    await expect(
      db.query("delete from public.financial_transactions where id=$1", [id]),
    ).rejects.toMatchObject({ code: "P1001" });
    await expect(
      db.query(
        "update public.financial_transactions set amount=50000 where id=$1",
        [id],
      ),
    ).rejects.toMatchObject({ code: "P1001" });
    expect(await balance(cash)).toBe("20000");
    await db.query(
      "update public.financial_transactions set amount=80000 where id=$1",
      [id],
    );
    expect(await balance(cash)).toBe("0");
  });
  it("hapus transfer ditolak jika uang pada tujuan sudah dibelanjakan", async () => {
    const cash = await account("500000");
    const bank = await account("0", "Bank");
    const id = await transfer("200000", cash, bank);
    const expense = await tx("expense", "150000", bank);
    await expect(
      db.query("delete from public.financial_transactions where id=$1", [id]),
    ).rejects.toMatchObject({ code: "P1001" });
    expect(await balance(cash)).toBe("300000");
    expect(await balance(bank)).toBe("50000");
    await db.query("delete from public.financial_transactions where id=$1", [
      expense,
    ]);
    await db.query("delete from public.financial_transactions where id=$1", [
      id,
    ]);
    expect(await balance(cash)).toBe("500000");
    expect(await balance(bank)).toBe("0");
  });
  it("edit transfer memeriksa penarikan kembali dana dari tujuan lama", async () => {
    const cash = await account("500000");
    const bank = await account("0", "Bank");
    const other = await account("0", "Lainnya");
    const id = await transfer("200000", cash, bank);
    await tx("expense", "150000", bank);
    await expect(
      db.query(
        "update public.financial_transactions set to_account_id=$1 where id=$2",
        [other, id],
      ),
    ).rejects.toMatchObject({ code: "P1001" });
    await expect(
      db.query(
        "update public.financial_transactions set amount=40000 where id=$1",
        [id],
      ),
    ).rejects.toMatchObject({ code: "P1001" });
    await db.query(
      "update public.financial_transactions set amount=160000 where id=$1",
      [id],
    );
    expect(await balance(bank)).toBe("10000");
  });
  it("perubahan income menjadi expense memperhitungkan kedua efek", async () => {
    const cash = await account();
    const id = await tx("income", "50000", cash);
    const change =
      "update public.financial_transactions set type='expense',amount=$1,category_id=(select id from public.financial_categories where type='expense' limit 1) where id=$2";
    await expect(db.query(change, ["120000", id])).rejects.toMatchObject({
      code: "P1001",
    });
    expect(await balance(cash)).toBe("150000");
    await db.query(change, ["80000", id]);
    expect(await balance(cash)).toBe("20000");
  });
  it("akun baru menolak saldo awal negatif, tetapi mengizinkan nol", async () => {
    await expect(account("-1")).rejects.toMatchObject({ code: "P1002" });
    expect(await balance(await account("0"))).toBe("0");
  });
  it("mengurangi saldo awal tidak boleh membuat saldo akhir minus", async () => {
    const cash = await account();
    await tx("expense", "80000", cash);
    await expect(
      db.query(
        "update public.financial_accounts set opening_balance=10000 where id=$1",
        [cash],
      ),
    ).rejects.toMatchObject({ code: "P1001" });
    await db.query(
      "update public.financial_accounts set opening_balance=80000 where id=$1",
      [cash],
    );
    expect(await balance(cash)).toBe("0");
  });
  it("dua debit dalam satu statement tidak bisa melampaui saldo dan rollback seluruhnya", async () => {
    const cash = await account();
    await expect(
      db.query(
        `insert into public.financial_transactions(user_id,type,amount,transaction_date,account_id,category_id)
      select $1,'expense',amount,'2026-10-30'::date,$2,(select id from public.financial_categories where type='expense' limit 1)
      from (values(60000),(50000)) expenses(amount)`,
        [A, cash],
      ),
    ).rejects.toMatchObject({ code: "P1001" });
    expect(await balance(cash)).toBe("100000");
    expect(
      (await db.query("select * from public.financial_transactions")).rows,
    ).toHaveLength(0);
  });
  it("BIGINT di atas safe integer tetap presisi sampai rupiah terakhir", async () => {
    const cash = await account("9007199254740993");
    await tx("expense", "9007199254740992", cash);
    expect(await balance(cash)).toBe("1");
    await expect(tx("expense", "2", cash)).rejects.toMatchObject({
      code: "P1001",
    });
    await tx("expense", "1", cash);
    expect(await balance(cash)).toBe("0");
  });
  it("saldo negatif lama dapat diperbaiki tanpa boleh ditambah defisitnya", async () => {
    const cash = await account("0");
    // Simulate a balance imported before this migration, using fixture-owner privileges.
    await db.exec(
      "reset role;alter table public.financial_accounts disable trigger sufficient_opening_balance",
    );
    await db.query(
      "update public.financial_accounts set opening_balance=-100000 where id=$1",
      [cash],
    );
    await db.exec(
      "alter table public.financial_accounts enable trigger sufficient_opening_balance",
    );
    await actor();
    await tx("income", "50000", cash);
    expect(await balance(cash)).toBe("-50000");
    await expect(tx("expense", "1", cash)).rejects.toMatchObject({
      code: "P1001",
    });
    await db.query(
      "update public.financial_accounts set name='Saldo lama' where id=$1",
      [cash],
    );
    await tx("income", "50000", cash);
    expect(await balance(cash)).toBe("0");
  });
  it("validasi saldo tidak membuka akses ke akun pengguna lain", async () => {
    const cash = await account();
    await actor(B);
    const other = (
      await db.query<{ id: string }>(
        "insert into public.financial_accounts(user_id,name,type) values($1,'B','bank') returning id",
        [B],
      )
    ).rows[0].id;
    await actor();
    await expect(transfer("100", cash, other)).rejects.toThrow();
    expect(await balance(cash)).toBe("100000");
    expect(
      (
        await db.query("select * from public.financial_accounts where id=$1", [
          other,
        ])
      ).rows,
    ).toHaveLength(0);
  });
});
