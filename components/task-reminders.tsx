"use client";
import Link from "next/link";
import { Bell, CalendarDays, Clock3, Settings2 } from "lucide-react";
import { Modal } from "./ui";
import type { ReminderState } from "@/lib/reminders/types";
import { dateLabel } from "@/lib/domain";

export function TaskReminders({
  state,
  today,
}: {
  state: ReminderState;
  today: string;
}) {
  const total = state.dueCount + state.overdueCount;
  if (!state.preferences.in_app_enabled) return null;
  return (
    <Modal
      title="Pengingat tugas"
      description="Tugas aktif yang jatuh tempo hari ini atau sudah terlambat, berdasarkan WIB."
      triggerClass="reminder-trigger icon-btn"
      trigger={
        <>
          <Bell size={19} />
          <span className="sr-only">
            Pengingat tugas{total ? `, ${total} tugas` : ""}
          </span>
          {total > 0 && (
            <span className="reminder-count" aria-hidden>
              {total > 99 ? "99+" : total}
            </span>
          )}
        </>
      }
    >
      {(close) => (
        <div className="reminder-content">
          {state.unavailable ? (
            <p className="notice warning" role="alert">
              Pengingat belum dapat dimuat. Muat ulang halaman untuk mencoba
              kembali.
            </p>
          ) : (
            <>
              <div className="reminder-summary">
                <span>
                  <CalendarDays size={17} />
                  <strong>{state.dueCount}</strong> Hari ini
                </span>
                <span>
                  <Clock3 size={17} />
                  <strong>{state.overdueCount}</strong> Terlambat
                </span>
              </div>
              {total === 0 ? (
                <p className="reminder-empty">
                  Tidak ada tenggat yang perlu diingatkan. Tugas yang sudah
                  selesai tidak ditampilkan.
                </p>
              ) : (
                <div className="reminder-list">
                  {state.tasks.map((task) => (
                    <Link
                      href={
                        task.due_date < today
                          ? "/tasks?status=overdue"
                          : "/tasks/today"
                      }
                      key={task.id}
                      onClick={close}
                    >
                      <span
                        className={task.due_date < today ? "warning-text" : ""}
                      >
                        {task.due_date < today ? "Terlambat" : "Hari ini"} ·{" "}
                        {dateLabel(task.due_date, true)}
                      </span>
                      <strong>{task.title}</strong>
                    </Link>
                  ))}
                </div>
              )}
              {total > state.tasks.length && (
                <p className="field-hint">
                  Menampilkan {state.tasks.length} dari {total} tugas.
                </p>
              )}
            </>
          )}
          <div className="reminder-links">
            <Link href="/tasks/today" className="btn primary" onClick={close}>
              Buka daftar tugas
            </Link>
            <Link
              href="/settings#reminders"
              className="text-link"
              onClick={close}
            >
              <Settings2 size={14} />
              Atur pengingat
            </Link>
          </div>
        </div>
      )}
    </Modal>
  );
}
