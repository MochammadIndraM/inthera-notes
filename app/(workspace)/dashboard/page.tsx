import {
  ArrowDownLeft,
  ArrowRightLeft,
  ArrowUpRight,
  CalendarDays,
  CircleCheck,
  ListTodo,
  Plus,
  Sparkles,
  Wallet,
} from "lucide-react";
import {
  getRecentTransactions,
  getSummary,
  getTasks,
  getWorkspace,
} from "@/lib/queries";
import { dateLabel, money, monthRange, todayWib } from "@/lib/domain";
import {
  Metric,
  PageHeading,
  Panel,
  CashFlowChart,
  ViewAll,
} from "@/components/shared";
import { TaskList } from "@/components/task-list";
import { TransactionList } from "@/components/transaction-list";
import {
  AccountEditor,
  TaskEditor,
  TransactionEditor,
} from "@/components/record-forms";
export const metadata = { title: "Dashboard" };
export default async function Dashboard() {
  const today = todayWib();
  const { start, end } = monthRange(today.slice(0, 7));
  const [workspace, summary, focus, transactions] = await Promise.all([
    getWorkspace(),
    getSummary(start, end),
    getTasks({}, "focus", 5),
    getRecentTransactions(),
  ]);
  const name = workspace.profile.display_name?.split(" ")[0];
  return (
    <>
      <PageHeading
        eyebrow="RUANG PRIBADIMU"
        title={name ? `Selamat datang, ${name}.` : "Hari baru, langkah baru."}
        description="Rencanakan yang berarti. Kelola uang dengan lebih tenang."
        actions={
          <span className="date-pill">
            <CalendarDays size={16} />
            {dateLabel(today, true)}
          </span>
        }
      />
      <div className="dashboard-banner">
        <div>
          <span className="banner-label">
            <span className="live-dot" />
            SATU WORKSPACE, DUA LANGKAH LEBIH MAJU
          </span>
          <h2>Hal besar dimulai dari catatan kecil.</h2>
          <p>Rapikan prioritasmu, lalu beri setiap rupiah arah yang jelas.</p>
        </div>
        <span className="banner-art" aria-hidden>
          <span />
          <span />
          <span />
          <Sparkles size={35} strokeWidth={1.2} />
        </span>
      </div>
      <div className="metrics-grid">
        <Metric
          label="Tugas aktif"
          value={summary.active_tasks}
          note={`${summary.due_today} jatuh tempo hari ini`}
          icon={ListTodo}
        />
        <Metric
          label="Selesai hari ini"
          value={summary.completed_today}
          note="Langkah kecil yang sudah berarti"
          icon={CircleCheck}
          tone="green"
        />
        <Metric
          label="Total saldo terkini"
          value={money(summary.balance)}
          note="Semua akun, termasuk arsip"
          icon={Wallet}
          tone="blue"
        />
        <Metric
          label="Pengeluaran bulan ini"
          value={money(summary.expense)}
          note="Catatan bulan berjalan · WIB"
          icon={ArrowUpRight}
          tone="rose"
        />
      </div>
      {!workspace.accounts.length && (
        <div className="onboarding-strip">
          <div>
            <span className="metric-icon violet">
              <Wallet size={19} />
            </span>
            <div>
              <strong>Kenali keuanganmu, mulai dari satu akun.</strong>
              <p>Tambahkan Tunai, Bank, atau E-wallet dengan saldo awalmu.</p>
            </div>
          </div>
          <AccountEditor
            trigger={
              <>
                Buat akun pertama <Plus size={16} />
              </>
            }
            triggerClass="btn secondary"
          />
        </div>
      )}
      <div className="dashboard-columns">
        <Panel
          title="Fokus hari ini"
          subtitle={`${summary.due_today} tugas hari ini · ${summary.overdue} perlu perhatian`}
          action={<ViewAll href="/tasks/today" />}
        >
          <TaskList
            tasks={focus.data}
            projects={workspace.projects}
            today={today}
            compact
          />
          <div className="panel-bottom">
            <TaskEditor
              projects={workspace.projects}
              trigger={
                <>
                  <Plus size={15} />
                  Tambah tugas baru
                </>
              }
              triggerClass="add-inline"
            />
          </div>
        </Panel>
        <Panel
          title="Arus kas bulan ini"
          subtitle="Setiap rupiah punya cerita"
          action={<ViewAll href="/finance">Detail</ViewAll>}
        >
          <CashFlowChart summary={summary} />
          <div className="net-flow">
            <span>Arus kas bersih</span>
            <strong
              className={
                BigInt(summary.income) >= BigInt(summary.expense)
                  ? "income-text"
                  : "expense-text"
              }
            >
              {money(BigInt(summary.income) - BigInt(summary.expense))}
            </strong>
          </div>
        </Panel>
      </div>
      <Panel
        title="Aksi cepat"
        subtitle="Catat sekarang, lanjutkan harimu."
        className="quick-actions-panel"
      >
        <div className="quick-action-grid">
          <TaskEditor
            projects={workspace.projects}
            trigger={
              <>
                <span className="quick-action-icon violet">
                  <CircleCheck size={20} />
                </span>
                <span>
                  <strong>Tambah tugas</strong>
                  <small>Satu langkah berikutnya</small>
                </span>
                <Plus size={15} />
              </>
            }
            triggerClass="quick-action"
          />
          {(
            [
              [
                "expense",
                "Catat pengeluaran",
                "Ke mana uangmu pergi",
                ArrowUpRight,
                "rose",
              ],
              [
                "income",
                "Catat pemasukan",
                "Rayakan uang yang masuk",
                ArrowDownLeft,
                "green",
              ],
              [
                "transfer",
                "Transfer antarakun",
                "Atur tempat menyimpan",
                ArrowRightLeft,
                "blue",
              ],
            ] as const
          ).map(([type, title, detail, Icon, tone]) => (
            <TransactionEditor
              key={type}
              workspace={workspace}
              initialType={type}
              trigger={
                <>
                  <span className={"quick-action-icon " + tone}>
                    <Icon size={20} />
                  </span>
                  <span>
                    <strong>{title}</strong>
                    <small>{detail}</small>
                  </span>
                  <Plus size={15} />
                </>
              }
              triggerClass="quick-action"
            />
          ))}
        </div>
      </Panel>
      <Panel
        title="Transaksi terakhir"
        subtitle="Catatan terbaru dari semua akunmu"
        action={<ViewAll href="/finance/transactions" />}
      >
        <TransactionList
          transactions={transactions}
          workspace={workspace}
          compact
        />
      </Panel>
    </>
  );
}
