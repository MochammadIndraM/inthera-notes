import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  mutate: vi.fn(),
  table: vi.fn(),
  refresh: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.refresh }));
import { changeRecord, saveRecord } from "@/lib/actions/records";

const user = "10000000-0000-4000-8000-000000000001";
const cash = "10000000-0000-4000-8000-000000000002";
const category = "10000000-0000-4000-8000-000000000003";
const id = "10000000-0000-4000-8000-000000000004";
type Result = {
  data: unknown;
  error: { code: string; message?: string } | null;
};
const ok = (data: unknown): Result => ({ data, error: null });
const old = {
  id,
  user_id: user,
  type: "expense",
  amount: "80000",
  account_id: cash,
  from_account_id: null,
  to_account_id: null,
  category_id: category,
};
const account = { id: cash, name: "Tunai", type: "cash", is_archived: false };
const relations = () => [
  ok(account),
  ok({ id: category, type: "expense", is_archived: false }),
];
const balances = (amount: string) =>
  ok([{ id: cash, name: "Tunai", balance: amount }]);
function setup(results: Result[], authenticated = true) {
  mocks.createClient.mockResolvedValue({
    auth: {
      getUser: async () => ({
        data: { user: authenticated ? { id: user } : null },
      }),
    },
    from: (table: string) => {
      mocks.table(table);
      const response = results.shift();
      if (!response) throw new Error("Unexpected query: " + table);
      const chain: Record<string, unknown> = {};
      for (const method of ["select", "eq", "in"]) chain[method] = () => chain;
      for (const method of ["insert", "update", "delete"])
        chain[method] = (...args: unknown[]) => {
          mocks.mutate(table, method, ...args);
          return chain;
        };
      chain.single = async () => response;
      chain.maybeSingle = async () => response;
      chain.then = (resolve: (result: Result) => unknown) =>
        Promise.resolve(response).then(resolve);
      return chain;
    },
  });
}
function form(amount = "200000", edit = false) {
  const value = new FormData();
  for (const [key, data] of Object.entries({
    type: "expense",
    amount,
    transaction_date: "2026-10-30",
    account_id: cash,
    from_account_id: "",
    to_account_id: "",
    category_id: category,
    title: "Pengujian",
    notes: "",
  }))
    value.set(key, data);
  if (edit) value.set("id", id);
  return value;
}
function accountForm(amount: string, edit = false) {
  const value = new FormData();
  for (const [key, data] of Object.entries({
    name: "Tunai",
    type: "cash",
    opening_balance: amount,
    opened_on: "",
  }))
    value.set(key, data);
  if (edit) value.set("id", cash);
  return value;
}
beforeEach(() => {
  vi.clearAllMocks();
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("Validasi saldo Server Actions", () => {
  it("menolak expense 200k dari saldo database 100k sebelum menulis", async () => {
    setup([...relations(), balances("100000")]);
    const result = await saveRecord("transaction", form());
    expect(result.ok).toBe(false);
    expect(result.message).toContain("Saldo Tunai tidak cukup");
    expect(result.errors?.amount).toBeDefined();
    expect(mocks.mutate).not.toHaveBeenCalled();
    expect(mocks.refresh).not.toHaveBeenCalled();
  });
  it("mengizinkan nominal tepat sebesar saldo", async () => {
    setup([...relations(), balances("100000"), ok({ id }), ok(null)]);
    expect((await saveRecord("transaction", form("100000"))).ok).toBe(true);
    expect(mocks.mutate).toHaveBeenCalledOnce();
  });
  it("tetap menolak jika guard database mendeteksi saldo berubah setelah preflight", async () => {
    setup([
      ...relations(),
      balances("100000"),
      {
        data: null,
        error: { code: "P1001", message: "raw private database detail" },
      },
    ]);
    const result = await saveRecord("transaction", form("100000"));
    expect(result.ok).toBe(false);
    expect(result.message).toContain("saldo akun tidak cukup");
    expect(result.message).not.toContain("raw private");
    expect(mocks.refresh).not.toHaveBeenCalled();
  });
  it("edit memakai amount string dari view dan hanya tambahan nominal, tanpa pembulatan", async () => {
    setup([
      ok({ ...old, amount: "9007199254740993" }),
      ...relations(),
      balances("1"),
      ok({ id }),
      ok(null),
    ]);
    expect(
      (await saveRecord("transaction", form("9007199254740994", true))).ok,
    ).toBe(true);
    expect(mocks.table).toHaveBeenCalledWith("transaction_records");
    expect(mocks.mutate).toHaveBeenCalledOnce();
  });
  it("hapus income yang telah digunakan ditolak sebelum DELETE", async () => {
    setup([
      ok({ ...old, type: "income", amount: "100000" }),
      balances("20000"),
    ]);
    expect((await changeRecord("transaction", id, "delete")).ok).toBe(false);
    expect(mocks.mutate).not.toHaveBeenCalled();
  });
  it("akun baru tidak menerima saldo awal negatif", async () => {
    setup([]);
    const result = await saveRecord("account", accountForm("-100000"));
    expect(result.ok).toBe(false);
    expect(result.errors?.opening_balance).toBeDefined();
    expect(mocks.mutate).not.toHaveBeenCalled();
  });
  it("edit saldo awal memeriksa saldo akhir akun", async () => {
    setup([ok({ ...account, balance: "20000", opening_balance: "100000" })]);
    const result = await saveRecord("account", accountForm("10000", true));
    expect(result.ok).toBe(false);
    expect(result.errors?.opening_balance).toBeDefined();
    expect(mocks.mutate).not.toHaveBeenCalled();
  });
  it("pengguna tanpa sesi tidak dapat membaca atau mengubah saldo", async () => {
    setup([], false);
    expect((await saveRecord("transaction", form())).redirectTo).toBe("/login");
    expect(mocks.table).not.toHaveBeenCalled();
    expect(mocks.mutate).not.toHaveBeenCalled();
  });
});
