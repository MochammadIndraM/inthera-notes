import { CalendarDays, Flag, Search } from "lucide-react";
import Link from "next/link";
import { dateLabel, taskGroup } from "@/lib/domain";
import type { Project, SearchParams, Task } from "@/lib/types";
import { stringParam } from "@/lib/queries";
import { TaskEditor, DeleteRecord } from "./record-forms";
import { TaskToggle } from "./record-actions";
import { EmptyState } from "./ui";

export function TaskList({
  tasks,
  projects,
  today,
  compact = false,
}: {
  tasks: Task[];
  projects: Project[];
  today: string;
  compact?: boolean;
}) {
  if (!tasks.length)
    return (
      <EmptyState
        title="Ruang untuk hal berikutnya"
        description="Belum ada tugas di daftar ini. Mulai dengan satu langkah kecil."
        action={
          <TaskEditor projects={projects} triggerClass="btn secondary small" />
        }
      />
    );
  const groups = [
    "Perlu perhatian",
    "Hari ini",
    "Mendatang",
    "Tanpa tenggat",
    "Selesai",
  ];
  return (
    <div className={"task-list " + (compact ? "compact" : "")}>
      {groups.map((group) => {
        const rows = tasks.filter((task) => taskGroup(task, today) === group);
        if (!rows.length) return null;
        return (
          <section className="task-group" key={group}>
            <h3
              className={group === "Perlu perhatian" ? "overdue-heading" : ""}
            >
              {group}
              <span>{rows.length}</span>
            </h3>
            {rows.map((task) => (
              <div
                className={
                  "task-row " + (task.status === "done" ? "task-done" : "")
                }
                key={task.id}
              >
                <TaskToggle
                  id={task.id}
                  title={task.title}
                  done={task.status === "done"}
                />
                <div className="task-content">
                  <strong>{task.title}</strong>
                  <div className="task-meta">
                    <span
                      className={
                        group === "Perlu perhatian" ? "warning-text" : ""
                      }
                    >
                      <CalendarDays size={12} />
                      {group === "Perlu perhatian" ? "Terlambat · " : ""}
                      {dateLabel(task.due_date)}
                    </span>
                    {task.project_id && (
                      <Link href={"/tasks?project=" + task.project_id}>
                        <span
                          className="project-dot"
                          style={{
                            background: projects.find(
                              (p) => p.id === task.project_id,
                            )?.color,
                          }}
                        />
                        {projects.find((p) => p.id === task.project_id)?.name ??
                          "Proyek"}
                      </Link>
                    )}
                    {task.status === "in_progress" && <span>Dikerjakan</span>}
                  </div>
                  {task.description && !compact && (
                    <p className="task-description">{task.description}</p>
                  )}
                </div>
                <span className={"priority-badge " + task.priority}>
                  <Flag size={11} />
                  {
                    { low: "Rendah", medium: "Sedang", high: "Tinggi" }[
                      task.priority
                    ]
                  }
                </span>
                <div className="row-actions">
                  <TaskEditor task={task} projects={projects} />
                  <DeleteRecord entity="task" id={task.id} label={task.title} />
                </div>
              </div>
            ))}
          </section>
        );
      })}
    </div>
  );
}
export function TaskFilters({
  params,
  projects,
}: {
  params: SearchParams;
  projects: Project[];
}) {
  return (
    <form method="get" className="filters task-filters">
      <label className="filter-search">
        <Search size={17} />
        <input
          name="q"
          placeholder="Cari tugas…"
          aria-label="Cari berdasarkan judul tugas"
          defaultValue={stringParam(params, "q")}
          maxLength={160}
        />
      </label>
      <label>
        <span className="sr-only">Status tugas</span>
        <select name="status" defaultValue={stringParam(params, "status")}>
          <option value="">Semua status</option>
          <option value="active">Aktif</option>
          <option value="todo">Belum dimulai</option>
          <option value="in_progress">Dikerjakan</option>
          <option value="done">Selesai</option>
          <option value="overdue">Terlambat</option>
          <option value="undated">Tanpa tenggat</option>
        </select>
      </label>
      <label>
        <span className="sr-only">Prioritas</span>
        <select name="priority" defaultValue={stringParam(params, "priority")}>
          <option value="">Semua prioritas</option>
          <option value="high">Tinggi</option>
          <option value="medium">Sedang</option>
          <option value="low">Rendah</option>
        </select>
      </label>
      <label>
        <span className="sr-only">Proyek</span>
        <select name="project" defaultValue={stringParam(params, "project")}>
          <option value="">Semua proyek</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
              {p.is_archived ? " (arsip)" : ""}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span className="sr-only">Tanggal tenggat</span>
        <input
          name="due"
          type="date"
          aria-label="Tanggal tenggat"
          defaultValue={stringParam(params, "due")}
        />
      </label>
      <label>
        <span className="sr-only">Urutan</span>
        <select name="sort" defaultValue={stringParam(params, "sort")}>
          <option value="">Tenggat terdekat</option>
          <option value="newest">Terbaru dibuat</option>
        </select>
      </label>
      <button className="btn secondary">Terapkan</button>
      <Link className="text-link" href="?">
        Reset
      </Link>
    </form>
  );
}
