import { CalendarCheck, CircleCheck, Clock3 } from "lucide-react";
import { getSummary, getTasks, getWorkspace } from "@/lib/queries";
import { monthRange, todayWib } from "@/lib/domain";
import type { SearchParams } from "@/lib/types";
import { Metric, PageHeading, Pagination } from "../shared";
import { TaskFilters, TaskList } from "../task-list";
import { TaskEditor } from "../record-forms";
export async function TaskPage({
  params,
  view = "all",
}: {
  params: SearchParams;
  view?: string;
}) {
  const today = todayWib();
  const { start, end } = monthRange(today.slice(0, 7));
  const [workspace, tasks, summary] = await Promise.all([
    getWorkspace(),
    getTasks(params, view),
    getSummary(start, end),
  ]);
  return (
    <>
      <PageHeading
        eyebrow="PRODUKTIVITAS"
        title={
          view === "today"
            ? "Fokus untuk hari ini."
            : view === "upcoming"
              ? "Siapkan langkah berikutnya."
              : "Tugas saya."
        }
        description={
          view === "today"
            ? "Tenggat hari ini dan hal yang perlu perhatian, dalam satu tempat."
            : "Pecah rencana besar menjadi langkah kecil yang bisa diselesaikan."
        }
        actions={<TaskEditor projects={workspace.projects} />}
      />
      <div className="metrics-grid three">
        <Metric
          label="Aktif hari ini"
          value={summary.due_today}
          note="Tenggat tepat hari ini · WIB"
          icon={CalendarCheck}
        />
        <Metric
          label="Selesai hari ini"
          value={summary.completed_today}
          note="Berdasarkan waktu penyelesaian · WIB"
          icon={CircleCheck}
          tone="green"
        />
        <Metric
          label="Perlu perhatian"
          value={summary.overdue}
          note="Tenggat lewat dan belum selesai"
          icon={Clock3}
          tone="amber"
        />
      </div>
      <section className="panel">
        <TaskFilters params={params} projects={workspace.projects} />
        <TaskList
          tasks={tasks.data}
          projects={workspace.projects}
          today={today}
        />
        <Pagination {...tasks} params={params} />
      </section>
    </>
  );
}
