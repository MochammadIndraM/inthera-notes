import { getBudgets, getWorkspace, period } from "@/lib/queries";
import { money, percent } from "@/lib/domain";
import type { SearchParams } from "@/lib/types";
import { PageHeading, MonthFilter } from "@/components/shared";
import { BudgetEditor, DeleteRecord } from "@/components/record-forms";
import { EmptyState } from "@/components/ui";
export const metadata = { title: "Anggaran" };
export default async function Budgets({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const { start } = period({ month: params.month });
  const [workspace, budgets] = await Promise.all([
    getWorkspace(),
    getBudgets(start),
  ]);
  const month = start.slice(0, 7);
  return (
    <>
      <PageHeading
        eyebrow="KEUANGAN PRIBADI"
        title="Beri batas, sisakan ruang."
        description="Pantau pengeluaran kategori setiap bulan tanpa rollover otomatis."
        actions={
          <BudgetEditor categories={workspace.categories} month={month} />
        }
      />
      <div className="section-toolbar">
        <p>Rencana pengeluaran bulanan</p>
        <MonthFilter month={month} />
      </div>
      {budgets.length ? (
        <div className="resource-grid">
          {budgets.map((b) => {
            const progress = percent(b.spent, b.limit_amount);
            const state =
              progress >= 100
                ? "danger"
                : progress >= 80
                  ? "warning"
                  : "success";
            return (
              <article className="resource-card budget-card" key={b.id}>
                <div className="resource-top">
                  <span className={"badge " + state}>
                    {progress >= 100
                      ? "Limit tercapai / terlampaui"
                      : progress >= 80
                        ? "Mendekati limit"
                        : "Masih dalam rencana"}
                  </span>
                  <div className="row-actions">
                    <BudgetEditor
                      budget={b}
                      categories={workspace.categories}
                      month={month}
                    />
                    <DeleteRecord
                      entity="budget"
                      id={b.id}
                      label={b.category_name}
                    />
                  </div>
                </div>
                <h2>{b.category_name}</h2>
                <strong className="budget-spent">
                  {money(b.spent)}
                  <small> / {money(b.limit_amount)}</small>
                </strong>
                <div className={"budget-track " + state}>
                  <span style={{ width: Math.min(100, progress) + "%" }} />
                </div>
                <div className="budget-footer">
                  <span>
                    {progress.toLocaleString("id-ID", {
                      maximumFractionDigits: 1,
                    })}
                    % terpakai
                  </span>
                  <span>
                    {BigInt(b.spent) > BigInt(b.limit_amount)
                      ? "Lebih " +
                        money(BigInt(b.spent) - BigInt(b.limit_amount))
                      : "Sisa " +
                        money(BigInt(b.limit_amount) - BigInt(b.spent))}
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <section className="panel">
          <EmptyState
            title="Rencanakan sebelum membelanjakan"
            description="Buat anggaran per kategori. Realisasinya mengikuti catatan pengeluaranmu."
            action={
              <BudgetEditor categories={workspace.categories} month={month} />
            }
          />
        </section>
      )}
    </>
  );
}
