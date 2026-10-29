import { Download } from "lucide-react";
import { getSummary, period, stringParam } from "@/lib/queries";
import { dateLabel } from "@/lib/domain";
import type { SearchParams } from "@/lib/types";
import {
  PageHeading,
  Panel,
  FinanceMetrics,
  CashFlowChart,
  CategoryBreakdown,
} from "@/components/shared";
export const metadata = { title: "Laporan" };
export default async function Reports({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const { start, end } = period(params);
  const summary = await getSummary(start, end);
  const exportParams = new URLSearchParams({
    start,
    end: new Date(Date.parse(end) - 86400000).toISOString().slice(0, 10),
  });
  return (
    <>
      <PageHeading
        eyebrow="KEUANGAN PRIBADI"
        title="Lihat cerita di balik angka."
        description="Ringkasan yang membantu melihat kebiasaan dan merencanakan ke depan."
        actions={
          <a
            className="btn primary"
            href={"/api/export?" + exportParams.toString()}
          >
            <Download size={17} />
            Unduh laporan CSV
          </a>
        }
      />
      <form className="filters reports-filters">
        <label>
          Bulan
          <input
            name="month"
            type="month"
            min="1900-01"
            max="9999-11"
            defaultValue={start.slice(0, 7)}
          />
        </label>
        <label>
          Dari tanggal
          <input
            type="date"
            name="start"
            min="1900-01-01"
            max="9999-12-30"
            defaultValue={stringParam(params, "start")}
          />
        </label>
        <label>
          Sampai tanggal
          <input
            type="date"
            name="end"
            min="1900-01-01"
            max="9999-12-30"
            defaultValue={stringParam(params, "end")}
          />
        </label>
        <button className="btn secondary">Tampilkan laporan</button>
        <p className="filter-help">
          Isi kedua tanggal untuk menggantikan bulan (maksimal 367 hari).
          Rentang tidak valid menggunakan bulan terpilih.
        </p>
      </form>
      <p className="report-period">
        Periode mulai {dateLabel(start, true)} hingga sebelum{" "}
        {dateLabel(end, true)} · WIB
      </p>
      <FinanceMetrics summary={summary} />
      <div className="dashboard-columns">
        <Panel
          title="Tren arus kas"
          subtitle="Pemasukan dan pengeluaran, tanpa transfer"
        >
          <CashFlowChart summary={summary} />
        </Panel>
        <Panel
          title="Kategori pengeluaran"
          subtitle="Diurutkan dari nominal terbesar"
        >
          <CategoryBreakdown summary={summary} />
        </Panel>
      </div>
      <p className="field-hint">
        CSV berisi seluruh transaksi pada periode terpilih, termasuk transfer
        sebagai satu baris. Teks dilindungi dari formula spreadsheet. Total
        saldo pada kartu selalu saldo terkini, bukan saldo akhir periode.
      </p>
    </>
  );
}
