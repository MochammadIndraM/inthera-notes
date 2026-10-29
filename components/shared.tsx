import Link from "next/link";
import {
  ArrowRight,
  ArrowDownLeft,
  ArrowUpRight,
  CircleCheck,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { dateLabel, money, percent } from "@/lib/domain";
import type { SearchParams, Summary } from "@/lib/types";

export function PageHeading({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {actions && <div className="heading-actions">{actions}</div>}
    </div>
  );
}
export function Panel({
  title,
  subtitle,
  action,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={"panel " + className}>
      <header className="panel-header">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}
export function ViewAll({
  href,
  children = "Lihat semua",
}: {
  href: string;
  children?: ReactNode;
}) {
  return (
    <Link href={href} className="text-link">
      {children}
      <ArrowRight size={14} />
    </Link>
  );
}
export function Metric({
  label,
  value,
  note,
  icon: Icon,
  tone = "violet",
}: {
  label: string;
  value: string | number;
  note: string;
  icon: LucideIcon;
  tone?: string;
}) {
  return (
    <article className="metric">
      <div className="metric-top">
        <span>{label}</span>
        <span className={"metric-icon " + tone}>
          <Icon size={19} />
        </span>
      </div>
      <strong
        className={
          "metric-value " + (String(value).includes("Rp") ? "currency" : "")
        }
        title={String(value)}
      >
        {value}
      </strong>
      <p>{note}</p>
    </article>
  );
}
export function FinanceMetrics({ summary }: { summary: Summary }) {
  return (
    <div className="metrics-grid">
      <Metric
        label="Total saldo terkini"
        value={money(summary.balance)}
        note="Semua akun, termasuk arsip"
        icon={Wallet}
      />
      <Metric
        label="Pemasukan periode ini"
        value={money(summary.income)}
        note="Tidak termasuk saldo awal & transfer"
        icon={ArrowDownLeft}
        tone="green"
      />
      <Metric
        label="Pengeluaran periode ini"
        value={money(summary.expense)}
        note="Berdasarkan tanggal transaksi"
        icon={ArrowUpRight}
        tone="rose"
      />
      <Metric
        label="Arus kas bersih"
        value={money(BigInt(summary.income) - BigInt(summary.expense))}
        note="Pemasukan dikurangi pengeluaran"
        icon={CircleCheck}
        tone="blue"
      />
    </div>
  );
}
export function MonthFilter({
  month,
  children,
}: {
  month: string;
  children?: ReactNode;
}) {
  return (
    <form className="month-filter" method="get">
      <label className="sr-only" htmlFor="month-filter">
        Pilih bulan laporan
      </label>
      <input
        id="month-filter"
        name="month"
        type="month"
        defaultValue={month}
        min="1900-01"
        max="9999-11"
        required
      />
      <button className="btn secondary small">Tampilkan</button>
      {children}
    </form>
  );
}
export function Pagination({
  count,
  page,
  limit,
  params,
}: {
  count: number;
  page: number;
  limit: number;
  params: SearchParams;
}) {
  const total = Math.max(1, Math.ceil(count / limit));
  function href(target: number) {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params))
      if (typeof value === "string" && key !== "page") search.set(key, value);
    search.set("page", String(target));
    return "?" + search.toString();
  }
  return (
    <div className="pagination">
      <p>
        {count
          ? `${(page - 1) * limit + 1}–${Math.min(page * limit, count)} dari ${count}`
          : "0 hasil"}
      </p>
      <div>
        {page > 1 && (
          <Link href={href(page - 1)} className="btn secondary small">
            Sebelumnya
          </Link>
        )}
        <span>
          Halaman {page} / {total}
        </span>
        {page < total && (
          <Link href={href(page + 1)} className="btn secondary small">
            Berikutnya
          </Link>
        )}
      </div>
    </div>
  );
}
export function CashFlowChart({ summary }: { summary: Summary }) {
  const max = summary.daily.reduce(
    (m, d) =>
      [BigInt(d.income), BigInt(d.expense), m].reduce((a, b) =>
        a > b ? a : b,
      ),
    BigInt(1),
  );
  const hasData =
    BigInt(summary.income) > BigInt(0) || BigInt(summary.expense) > BigInt(0);
  // Compress a long report into weekly bins; all totals remain textual below.
  const points =
    summary.daily.length > 35
      ? summary.daily.reduce<
          { date: string; income: string; expense: string }[]
        >((groups, day, index) => {
          if (index % 7 === 0) groups.push({ ...day });
          else {
            const last = groups[groups.length - 1];
            last.income = (BigInt(last.income) + BigInt(day.income)).toString();
            last.expense = (
              BigInt(last.expense) + BigInt(day.expense)
            ).toString();
          }
          return groups;
        }, [])
      : summary.daily;
  const chartMax =
    points.length === summary.daily.length
      ? max
      : points.reduce(
          (m, d) =>
            [m, BigInt(d.income), BigInt(d.expense)].reduce((a, b) =>
              a > b ? a : b,
            ),
          BigInt(1),
        );
  return (
    <div className="cashflow">
      <div className="chart-totals">
        <div>
          <span className="legend-dot income-dot" />
          Pemasukan
          <strong className="income-text">{money(summary.income)}</strong>
        </div>
        <div>
          <span className="legend-dot expense-dot" />
          Pengeluaran<strong>{money(summary.expense)}</strong>
        </div>
      </div>
      <div
        className="chart-area"
        role="img"
        aria-label={
          hasData
            ? `Grafik arus kas. Pemasukan ${money(summary.income)}, pengeluaran ${money(summary.expense)}.`
            : "Belum ada transaksi pada periode ini; seluruh nilai nol."
        }
      >
        <div className="chart-gridlines">
          <span />
          <span />
          <span />
          <span />
        </div>
        <div className="chart-bars">
          {points.map((day) => (
            <div
              className="chart-day"
              key={day.date}
              title={`${dateLabel(day.date)} — Masuk ${money(day.income)}, keluar ${money(day.expense)}`}
            >
              <span
                className="bar income-bar"
                style={{ height: percent(day.income, chartMax) + "%" }}
              />
              <span
                className="bar expense-bar"
                style={{ height: percent(day.expense, chartMax) + "%" }}
              />
            </div>
          ))}
        </div>
        {!hasData && (
          <span className="chart-empty-label">
            Ruang untuk cerita keuanganmu
          </span>
        )}
      </div>
      <div className="chart-axis">
        <span>{dateLabel(points[0]?.date ?? null)}</span>
        <span>
          {dateLabel(points[Math.floor(points.length / 2)]?.date ?? null)}
        </span>
        <span>{dateLabel(points.at(-1)?.date ?? null)}</span>
      </div>
      <details className="chart-data">
        <summary>
          Lihat angka per {summary.daily.length > 35 ? "pekan" : "hari"}
        </summary>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Pemasukan</th>
                <th>Pengeluaran</th>
              </tr>
            </thead>
            <tbody>
              {points.map((day) => (
                <tr key={day.date}>
                  <td>{dateLabel(day.date)}</td>
                  <td>{money(day.income)}</td>
                  <td>{money(day.expense)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
export function CategoryBreakdown({ summary }: { summary: Summary }) {
  return (
    <div className="category-breakdown">
      {summary.categories.length ? (
        summary.categories.map((category, i) => (
          <div className="category-progress" key={category.id}>
            <div>
              <span>
                <i
                  style={{
                    background: ["#8066e6", "#b7a2f4", "#b3b9f2", "#d1b4e8"][
                      i % 4
                    ],
                  }}
                />
                {category.name}
              </span>
              <strong>{money(category.amount)}</strong>
            </div>
            <div className="progress-track">
              <span
                style={{
                  width:
                    Math.min(100, percent(category.amount, summary.expense)) +
                    "%",
                }}
              />
            </div>
          </div>
        ))
      ) : (
        <p className="muted padded">Belum ada pengeluaran pada periode ini.</p>
      )}
    </div>
  );
}
