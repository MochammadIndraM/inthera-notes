"use client";
import { useRef, useState, useTransition, type ReactNode } from "react";
import { Archive, Check, LoaderCircle, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { changeRecord, type Entity } from "@/lib/actions/records";
import type { ActionResult } from "@/lib/types";

export function ActionButton({
  action,
  children,
  className = "btn secondary",
  label,
}: {
  action: () => Promise<ActionResult>;
  children: ReactNode;
  className?: string;
  label?: string;
}) {
  const [pending, startTransition] = useTransition();
  const lock = useRef(false);
  const router = useRouter();
  const [error, setError] = useState("");
  return (
    <span className="action-control">
      <button
        type="button"
        aria-label={label}
        title={label}
        className={className}
        disabled={pending}
        onClick={() => {
          if (lock.current) return;
          lock.current = true;
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
