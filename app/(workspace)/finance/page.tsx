import Link from "next/link";
import { Wallet } from "lucide-react";
import {
  getSummary,
  getTransactions,
  getWorkspace,
  period,
} from "@/lib/queries";
import { money } from "@/lib/domain";
import type { SearchParams } from "@/lib/types";
import {
  PageHeading,
  Panel,
  MonthFilter,
  FinanceMetrics,
  CashFlowChart,
  CategoryBreakdown,
  ViewAll,
} from "@/components/shared";
import { AccountEditor, TransactionEditor } from "@/components/record-forms";
import { TransactionList } from "@/components/transaction-list";
import { EmptyState } from "@/components/ui";
export const metadata = { title: "Ringkasan keuangan" };
export default async function Finance({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const { start, end } = period({ month: params.month });
  const [workspace, summary, transactions] = await Promise.all([
    getWorkspace(),
    getSummary(start, end),
    getTransactions({ month: start.slice(0, 7) }, 5),
  ]);
  return (
    <>
      <PageHeading
        eyebrow="KEUANGAN PRIBADI"
        title="Pahami arah uangmu."
        description="Gambaran yang jelas untuk keputusan yang lebih tenang."
        actions={<TransactionEditor workspace={workspace} />}
      />
      <div className="section-toolbar">
        <p>
          Ringkasan periode{" "}
          <strong>
            {new Intl.DateTimeFormat("id-ID", {
              month: "long",
              year: "numeric",
            }).format(new Date(start + "T12:00:00Z"))}
          </strong>
        </p>
        <MonthFilter month={start.slice(0, 7)} />
      </div>
      <FinanceMetrics summary={summary} />
      <div className="dashboard-columns">
        <Panel
          title="Pemasukan & pengeluaran"
          subtitle="Berdasarkan tanggal transaksi, tidak termasuk transfer"
        >
          <CashFlowChart summary={summary} />
        </Panel>
        <Panel
          title="Ke mana uangmu pergi?"
          subtitle="Pengeluaran per kategori"
        >
          <CategoryBreakdown summary={summary} />
        </Panel>
      </div>
      <Panel
        title="Akun keuanganmu"
        subtitle="Saldo terkini lintas waktu · termasuk akun arsip"
        action={<ViewAll href="/finance/accounts">Kelola akun</ViewAll>}
      >
        {workspace.accounts.length ? (
          <div className="account-strip">
            {workspace.accounts.map((a) => (
              <Link
                key={a.id}
                href={
                  "/finance/transactions?account=" +
                  a.id +
                  "&month=" +
                  start.slice(0, 7)
                }
                className="account-tile"
              >
                <span className="metric-icon violet">
                  <Wallet size={20} />
                </span>
                <span>
                  {a.name}
                  {a.is_archived && " (arsip)"}
                </span>
                <strong
                  className={
                    BigInt(a.balance) < BigInt(0) ? "expense-text" : ""
                  }
                >
                  {money(a.balance)}
                </strong>
                {BigInt(a.balance) < BigInt(0) && (
                  <small>Perhatian: saldo negatif</small>
                )}
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState
            title="Mulai dengan satu akun"
            description="Tambahkan tempat kamu menyimpan uang beserta saldo awalnya."
            action={<AccountEditor />}
          />
        )}
      </Panel>
      <Panel
        title="Transaksi pada periode ini"
        action={
          <ViewAll href={"/finance/transactions?month=" + start.slice(0, 7)} />
        }
      >
        <TransactionList
          transactions={transactions.data}
          workspace={workspace}
          compact
        />
      </Panel>
    </>
  );
}
