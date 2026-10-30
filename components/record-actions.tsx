"use client";
import { useRef, useState, useTransition, type ReactNode } from "react";
import { Archive, Check, LoaderCircle, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { changeRecord, type Entity } from "@/lib/actions/records";
import type { ActionResult } from "@/lib/types";
import { useConfirm, type ConfirmationOptions } from "./confirm-provider";

export function ActionButton({
  action,
  children,
  className = "btn secondary",
  label,
  confirmation,
}: {
  action: () => Promise<ActionResult>;
  children: ReactNode;
  className?: string;
  label?: string;
  confirmation?: ConfirmationOptions;
}) {
  const [pending, startTransition] = useTransition();
  const lock = useRef(false);
  const router = useRouter();
  const [error, setError] = useState("");
  const confirm = useConfirm();
  return (
    <span
      className="action-control"
      data-pending={pending ? "true" : undefined}
    >
      <button
        type="button"
        aria-label={label}
        aria-haspopup={confirmation ? "dialog" : undefined}
        aria-busy={pending}
        title={label}
        className={className}
        disabled={pending}
        onClick={async () => {
          if (lock.current) return;
          if (!navigator.onLine) {
            const message =
              "Kamu sedang offline. Sambungkan internet untuk menyimpan perubahan.";
            setError(message);
            toast.error(message);
            return;
          }
          lock.current = true;
          if (confirmation && !(await confirm(confirmation))) {
            lock.current = false;
            return;
          }
          if (!navigator.onLine) {
            lock.current = false;
            const message =
              "Kamu sedang offline. Sambungkan internet untuk menyimpan perubahan.";
            setError(message);
            toast.error(message);
            return;
          }
          setError("");
          startTransition(async () => {
            try {
              const result = await action();
              if (result.ok) toast.success(result.message);
              else {
                toast.error(result.message);
                setError(result.message);
              }
              if (result.redirectTo) {
                router.replace(result.redirectTo);
                router.refresh();
              }
            } catch {
              setError("Koneksi terputus. Muat ulang sebelum mencoba kembali.");
              toast.error(
                "Koneksi terputus. Muat ulang sebelum mencoba kembali.",
              );
            } finally {
              lock.current = false;
            }
          });
        }}
      >
        {pending ? <LoaderCircle size={16} className="spin" /> : children}
      </button>
      {error && (
        <span className="sr-only" role="alert">
          {error}
        </span>
      )}
    </span>
  );
}
export function TaskToggle({
  id,
  done,
  title,
}: {
  id: string;
  done: boolean;
  title: string;
}) {
  return (
    <ActionButton
      action={changeRecord.bind(null, "task", id, done ? "reopen" : "complete")}
      label={(done ? "Buka kembali: " : "Selesaikan: ") + title}
      className={"task-checkbox " + (done ? "checked" : "")}
    >
      {done && <Check size={14} />}
    </ActionButton>
  );
}
export function ArchiveButton({
  entity,
  id,
  archived,
}: {
  entity: Entity;
  id: string;
  archived: boolean;
}) {
  return (
    <ActionButton
      action={changeRecord.bind(
        null,
        entity,
        id,
        archived ? "restore" : "archive",
      )}
      className="icon-btn"
      label={archived ? "Aktifkan kembali" : "Arsipkan"}
    >
      {archived ? <RotateCcw size={15} /> : <Archive size={15} />}
    </ActionButton>
  );
}
