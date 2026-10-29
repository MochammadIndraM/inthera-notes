import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowRightLeft,
  ArrowUpRight,
  Search,
} from "lucide-react";
import { money, dateLabel } from "@/lib/domain";
import { stringParam } from "@/lib/queries";
import type { SearchParams, Transaction, Workspace } from "@/lib/types";
import { DeleteRecord, TransactionEditor } from "./record-forms";
import { EmptyState } from "./ui";

export function TransactionList({
  transactions,
  workspace,
  compact = false,
}: {
  transactions: Transaction[];
  workspace: Workspace;
  compact?: boolean;
}) {
  if (!transactions.length)
    return (
      <EmptyState
        title="Belum ada transaksi"
        description="Setiap catatan membantu memahami keuanganmu. Mulai dari transaksi hari ini."
        action={
          <TransactionEditor
            workspace={workspace}
            triggerClass="btn secondary small"
          />
        }
      />
    );
  return (
    <div
      className={"transaction-list " + (compact ? "compact" : "")}
      role="list"
    >
      {transactions.map((t) => {
        const Icon =
          t.type === "transfer"
            ? ArrowRightLeft
            : t.type === "income"
              ? ArrowDownLeft
              : ArrowUpRight;
        const typeLabel = {
          transfer: "Transfer",
          income: "Pemasukan",
          expense: "Pengeluaran",
        }[t.type];
        return (
          <div className="transaction-row" key={t.id} role="listitem">
            <span className={"transaction-icon " + t.type}>
              <Icon size={18} />
            </span>
            <div className="transaction-description">
              <strong>
                {t.title || t.category_name || "Transfer antarakun"}
              </strong>
              <span>
                {t.type === "transfer"
                  ? `${t.from_account_name} → ${t.to_account_name}`
                  : `${t.category_name} · ${t.account_name}`}
              </span>
              {t.notes && !compact && (
                <details className="transaction-notes">
                  <summary>Catatan detail</summary>
                  <p>{t.notes}</p>
                </details>
              )}
            </div>
            <div className="transaction-amount">
              <strong
                className={
                  t.type === "income"
                    ? "income-text"
                    : t.type === "expense"
                      ? "expense-text"
                      : ""
                }
              >
                {t.type === "income" ? "+ " : t.type === "expense" ? "− " : ""}
                {money(t.amount)}
              </strong>
              <span>
                {dateLabel(t.transaction_date)} · {typeLabel}
              </span>
            </div>
            {!compact && (
              <div className="row-actions">
                <TransactionEditor transaction={t} workspace={workspace} />
                <DeleteRecord
                  entity="transaction"
                  id={t.id}
                  label={t.title || t.category_name || "Transfer"}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
export function TransactionFilters({
  params,
  workspace,
  month,
}: {
  params: SearchParams;
  workspace: Workspace;
  month: string;
}) {
  return (
    <form method="get" className="filters transaction-filters">
      <label className="filter-search">
        <Search size={17} />
        <input
          name="q"
          aria-label="Cari catatan transaksi"
          placeholder="Cari catatan transaksi…"
          maxLength={160}
          defaultValue={stringParam(params, "q")}
        />
      </label>
      <label>
        <span className="sr-only">Bulan transaksi</span>
        <input
          type="month"
          name="month"
          min="1900-01"
          max="9999-11"
          defaultValue={month}
        />
      </label>
      <label>
        <span className="sr-only">Jenis transaksi</span>
        <select name="type" defaultValue={stringParam(params, "type")}>
          <option value="">Semua jenis</option>
          <option value="expense">Pengeluaran</option>
          <option value="income">Pemasukan</option>
          <option value="transfer">Transfer</option>
        </select>
      </label>
      <label>
        <span className="sr-only">Akun</span>
        <select name="account" defaultValue={stringParam(params, "account")}>
          <option value="">Semua akun</option>
          {workspace.accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
              {a.is_archived ? " (arsip)" : ""}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span className="sr-only">Kategori</span>
        <select name="category" defaultValue={stringParam(params, "category")}>
          <option value="">Semua kategori</option>
          {workspace.categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.type === "income" ? "masuk" : "keluar"})
            </option>
          ))}
        </select>
      </label>
      <label>
        <span className="sr-only">Urutan transaksi</span>
        <select name="sort" defaultValue={stringParam(params, "sort")}>
          <option value="">Terbaru</option>
          <option value="oldest">Terlama</option>
          <option value="largest">Nominal terbesar</option>
          <option value="smallest">Nominal terkecil</option>
        </select>
      </label>
      <label className="date-filter">
        <span>Dari</span>
        <input
          type="date"
          name="start"
          min="1900-01-01"
          max="9999-12-30"
          defaultValue={stringParam(params, "start")}
        />
      </label>
      <label className="date-filter">
        <span>Sampai</span>
        <input
          type="date"
          name="end"
          min="1900-01-01"
          max="9999-12-30"
          defaultValue={stringParam(params, "end")}
        />
      </label>
      <button className="btn secondary">Terapkan</button>
      <Link className="text-link" href="?">
        Reset
      </Link>
      <p className="filter-help">
        Rentang tanggal lengkap menggantikan bulan, maksimal 367 hari.
      </p>
    </form>
  );
}
