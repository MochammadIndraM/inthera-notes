import { describe, expect, it } from "vitest";
import {
  balanceChanges,
  insufficientBalance,
  type BalanceTransaction,
} from "@/lib/finance";
const cash = { id: "cash", name: "Tunai", balance: "100000" };
const expense = (amount: string): BalanceTransaction => ({
  type: "expense",
  amount,
  account_id: "cash",
  from_account_id: null,
  to_account_id: null,
});
describe("Pemeriksaan saldo memakai dampak bersih dan BIGINT", () => {
  it("100k menolak 200k, mengizinkan 100k", () => {
    expect(
      insufficientBalance([cash], balanceChanges(null, expense("200000"))),
    ).toContain("tidak cukup");
    expect(
      insufficientBalance([cash], balanceChanges(null, expense("100000"))),
    ).toBeNull();
  });
  it("edit hanya membutuhkan tambahan atas nominal lama", () => {
    expect(
      insufficientBalance(
        [{ ...cash, balance: "20000" }],
        balanceChanges(expense("80000"), expense("90000")),
      ),
    ).toBeNull();
    expect(
      insufficientBalance(
        [{ ...cash, balance: "20000" }],
        balanceChanges(expense("80000"), expense("110000")),
      ),
    ).toContain("tidak cukup");
  });
  it("menghapus income mengurangi saldo, menghapus expense mengembalikannya", () => {
    const income = {
      ...expense("100000"),
      type: "income",
    } as BalanceTransaction;
    expect(
      insufficientBalance(
        [{ ...cash, balance: "20000" }],
        balanceChanges(income, null),
      ),
    ).toContain("tidak cukup");
    expect(
      insufficientBalance([cash], balanceChanges(expense("200000"), null)),
    ).toBeNull();
  });
  it("mengganti tujuan transfer menilai tujuan lama juga", () => {
    const previous: BalanceTransaction = {
      type: "transfer",
      amount: "200000",
      account_id: null,
      from_account_id: "cash",
      to_account_id: "bank",
    };
    const changes = balanceChanges(previous, {
      ...previous,
      to_account_id: "other",
    });
    expect(
      insufficientBalance(
        [{ id: "bank", name: "Bank", balance: "50000" }],
        changes,
      ),
    ).toContain("Bank");
  });
  it("tidak kehilangan presisi pada jumlah di atas Number.MAX_SAFE_INTEGER", () => {
    const huge = { ...cash, balance: "9007199254740993" };
    expect(
      insufficientBalance(
        [huge],
        balanceChanges(null, expense("9007199254740993")),
      ),
    ).toBeNull();
    expect(
      insufficientBalance(
        [huge],
        balanceChanges(null, expense("9007199254740994")),
      ),
    ).toContain("tidak cukup");
  });
  it("legacy negatif boleh membaik tetapi tidak boleh memburuk", () => {
    const negative = { ...cash, balance: "-100000" };
    expect(
      insufficientBalance([negative], new Map([[cash.id, BigInt(50000)]])),
    ).toBeNull();
    expect(
      insufficientBalance([negative], new Map([[cash.id, BigInt(-1)]])),
    ).toContain("tidak cukup");
  });
});
