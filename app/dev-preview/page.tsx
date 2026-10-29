import { notFound } from "next/navigation";
import { CircleCheck, ListTodo, Wallet, ArrowUpRight } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import {
  CashFlowChart,
  Metric,
  PageHeading,
  Panel,
  ViewAll,
} from "@/components/shared";
import { TaskList } from "@/components/task-list";
import { TransactionList } from "@/components/transaction-list";
import { TaskEditor, TransactionEditor } from "@/components/record-forms";
import {
  fixtureSummary,
  fixtureTasks,
  fixtureTransactions,
  fixtureWorkspace,
} from "@/tests/fixtures/workspace";
import { money, todayWib } from "@/lib/domain";

export default function DevPreview() {
  if (
    process.env.NODE_ENV !== "development" ||
    process.env.INTHERA_UI_TEST !== "1"
  )
    notFound();
  return (
    <AppShell workspace={fixtureWorkspace}>
      <div className="notice warning" role="status">
        FIXTURE PENGUJIAN LOKAL — bukan data pengguna. Penyimpanan memerlukan
        backend asli. Route ini selalu 404 pada build produksi.
      </div>
      <PageHeading
        eyebrow="RUANG PRIBADIMU"
        title="Selamat datang, Pengguna."
        description="Rencanakan yang berarti. Kelola uang dengan lebih tenang."
        actions={<TaskEditor projects={fixtureWorkspace.projects} />}
      />
      <div className="dashboard-banner">
        <div>
          <span className="banner-label">
            SATU WORKSPACE, DUA LANGKAH LEBIH MAJU
          </span>
          <h2>Hal besar dimulai dari catatan kecil.</h2>
          <p>Rapikan prioritasmu, lalu beri setiap rupiah arah yang jelas.</p>
        </div>
      </div>
      <div className="metrics-grid">
        <Metric
          label="Tugas aktif"
          value={2}
          note="1 jatuh tempo hari ini"
          icon={ListTodo}
        />
        <Metric
          label="Selesai hari ini"
          value={0}
          note="Langkah yang berarti"
          icon={CircleCheck}
          tone="green"
        />
        <Metric
          label="Total saldo terkini"
          value={money("1650000")}
          note="Semua akun, termasuk arsip"
          icon={Wallet}
          tone="blue"
        />
        <Metric
          label="Pengeluaran bulan ini"
          value={money("50000")}
          note="Bulan berjalan · WIB"
          icon={ArrowUpRight}
          tone="rose"
        />
      </div>
      <div className="dashboard-columns">
        <Panel
          title="Fokus hari ini"
          subtitle="1 tugas hari ini · 1 perlu perhatian"
          action={<ViewAll href="/tasks/today" />}
        >
          <TaskList
            tasks={fixtureTasks}
            projects={fixtureWorkspace.projects}
            today={todayWib()}
            compact
          />
        </Panel>
        <Panel title="Arus kas bulan ini" subtitle="Setiap rupiah punya cerita">
          <CashFlowChart summary={fixtureSummary} />
        </Panel>
      </div>
      <Panel
        title="Transaksi terakhir"
        action={<TransactionEditor workspace={fixtureWorkspace} />}
      >
        <TransactionList
          transactions={fixtureTransactions}
          workspace={fixtureWorkspace}
        />
      </Panel>
    </AppShell>
  );
}
