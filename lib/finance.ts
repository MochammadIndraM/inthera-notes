import type { Account, Transaction } from "./types";
import { money } from "./domain";

export type BalanceTransaction = Pick<
  Transaction,
  "type" | "amount" | "account_id" | "from_account_id" | "to_account_id"
>;
export type BalanceAccount = Pick<Account, "id" | "name" | "balance">;

/** Net ledger change, including removal of the transaction being edited/deleted. */
export function balanceChanges(
  before: BalanceTransaction | null,
  after: BalanceTransaction | null,
) {
  const changes = new Map<string, bigint>();
  function add(id: string | null, amount: bigint) {
    if (id) changes.set(id, (changes.get(id) ?? BigInt(0)) + amount);
  }
  function apply(transaction: BalanceTransaction | null, sign: bigint) {
    if (!transaction) return;
    const amount = BigInt(transaction.amount) * sign;
    if (transaction.type === "income") add(transaction.account_id, amount);
    else if (transaction.type === "expense")
      add(transaction.account_id, -amount);
    else {
      add(transaction.from_account_id, -amount);
      add(transaction.to_account_id, amount);
    }
  }
  apply(before, BigInt(-1));
  apply(after, BigInt(1));
  return changes;
}

export function insufficientBalance(
  accounts: BalanceAccount[],
  changes: Map<string, bigint>,
) {
  for (const account of accounts) {
    const change = changes.get(account.id) ?? BigInt(0);
    if (change < BigInt(0) && BigInt(account.balance) + change < BigInt(0)) {
      return `Saldo ${account.name} tidak cukup. Saldo saat ini ${money(account.balance)}; perubahan ini membutuhkan ${money(-change)}. Kurangi nominal atau periksa transaksi terkait.`;
    }
  }
  return null;
}
