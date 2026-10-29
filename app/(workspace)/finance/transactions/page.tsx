import Link from "next/link";
import { Download } from "lucide-react";
import { getTransactions, getWorkspace, period } from "@/lib/queries";
import type { SearchParams } from "@/lib/types";
import { PageHeading, Pagination } from "@/components/shared";
import { TransactionEditor } from "@/components/record-forms";
import {
  TransactionFilters,
  TransactionList,
} from "@/components/transaction-list";
export const metadata = { title: "Transaksi" };
export default async function Transactions({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const [workspace, transactions] = await Promise.all([
    getWorkspace(),
    getTransactions(params),
  ]);
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params))
    if (typeof value === "string" && key !== "page") search.set(key, value);
  return (
    <>
      <PageHeading
        eyebrow="KEUANGAN PRIBADI"
        title="Setiap transaksi, tercatat."
        description="Catatan kecil hari ini, gambaran yang lebih jelas untuk esok."
        actions={
          <>
            <a
              href={"/api/export?" + search.toString()}
              className="btn secondary"
            >
              <Download size={16} />
              Ekspor CSV
            </a>
            <TransactionEditor workspace={workspace} />
          </>
        }
      />
      <section className="panel">
        <TransactionFilters
          workspace={workspace}
          params={params}
          month={period(params).start.slice(0, 7)}
        />
        <div className="list-caption">
          <span>{transactions.count} transaksi ditemukan</span>
          <Link href="/settings#categories" className="text-link">
            Kelola kategori →
          </Link>
        </div>
        <TransactionList
          transactions={transactions.data}
          workspace={workspace}
        />
        <Pagination {...transactions} params={params} />
      </section>
    </>
  );
}
