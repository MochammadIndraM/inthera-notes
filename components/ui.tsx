"use client";

import {
  cloneElement,
  createContext,
  isValidElement,
  startTransition,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type InputHTMLAttributes,
  type ReactElement,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { Check, CircleAlert, Inbox, LoaderCircle, Plus, X } from "lucide-react";
import { toast } from "sonner";
import type { ActionResult } from "@/lib/types";
import { formatMoneyInput, isMoneyPaste } from "@/lib/money-input";
import { useConfirm } from "./confirm-provider";

const ErrorContext = createContext<Record<string, string[]>>({});
type ControlProps = Pick<
  InputHTMLAttributes<HTMLInputElement>,
  "id" | "aria-invalid" | "aria-describedby"
>;
export function Field({
  label,
  name,
  children,
  hint,
}: {
  label: string;
  name: string;
  children: ReactNode;
  hint?: string;
}) {
  const errors = useContext(ErrorContext);
  const id = useId();
  const description =
    [hint ? id + "-hint" : "", errors[name]?.length ? id + "-error" : ""]
      .filter(Boolean)
      .join(" ") || undefined;
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {isValidElement(children)
        ? cloneElement(children as ReactElement<ControlProps>, {
            id,
            "aria-invalid": !!errors[name]?.length,
            "aria-describedby": description,
          })
        : children}
      {hint && (
        <p className="field-hint" id={id + "-hint"}>
          {hint}
        </p>
      )}
      {errors[name]?.length ? (
        <p className="field-error" id={id + "-error"} role="alert">
          {errors[name].join(" ")}
        </p>
      ) : null}
    </div>
  );
}
export function MutationForm({
  action,
  children,
  onSuccess,
  submit = "Simpan",
  className = "",
}: {
  action: (form: FormData) => Promise<ActionResult>;
  children: ReactNode;
  onSuccess?: (form: FormData) => void;
  submit?: string;
  className?: string;
}) {
  const router = useRouter();
  const [result, setResult] = useState<ActionResult | null>(null);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <ErrorContext.Provider value={result?.errors ?? {}}>
      <form
        ref={formRef}
        data-pending={busy ? "true" : undefined}
        onChange={(event) => {
          event.currentTarget.dataset.dirty = "true";
        }}
        className={"form-stack " + className}
        onSubmit={(event) => {
          event.preventDefault();
          if (lock.current) return;
          if (!navigator.onLine) {
            setResult({
              ok: false,
              message:
                "Kamu sedang offline. Sambungkan internet, lalu simpan kembali. Isianmu tetap tersedia.",
            });
            return;
          }
          const form = new FormData(event.currentTarget);
          lock.current = true;
          setBusy(true);
          setResult(null);
          startTransition(async () => {
            try {
              const response = await action(form);
              setResult(response);
              if (response.ok) {
                if (formRef.current) formRef.current.dataset.dirty = "false";
                toast.success(response.message);
                if (response.warning) toast.warning(response.warning);
                onSuccess?.(form);
              }
              if (response.redirectTo) {
                router.replace(response.redirectTo);
                router.refresh();
              }
            } catch {
              setResult({
                ok: false,
                message:
                  "Koneksi terputus. Isian tetap tersedia. Muat ulang untuk memeriksa apakah data sudah tersimpan sebelum mencoba lagi.",
              });
            } finally {
              lock.current = false;
              setBusy(false);
            }
          });
        }}
      >
        <fieldset disabled={busy}>{children}</fieldset>
        {result && (
          <div
            className={result.ok ? "notice success" : "notice danger"}
            role={result.ok ? "status" : "alert"}
          >
            {result.ok ? <Check size={17} /> : <CircleAlert size={17} />}
            <span>{result.message}</span>
          </div>
        )}
        <button
          className="btn primary form-submit"
          disabled={busy}
          type="submit"
        >
          {busy ? (
            <LoaderCircle className="spin" size={17} />
          ) : (
            <Check size={17} />
          )}{" "}
          {busy ? "Menyimpan…" : submit}
        </button>
      </form>
    </ErrorContext.Provider>
  );
}
export function Modal({
  title,
  children,
  trigger,
  triggerClass = "btn primary",
  triggerLabel,
  dialogClassName = "",
  description,
}: {
  title: string;
  children: ReactNode | ((close: () => void) => ReactNode);
  trigger?: ReactNode;
  triggerClass?: string;
  triggerLabel?: string;
  dialogClassName?: string;
  description?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const closeRequested = useRef(false);
  const confirm = useConfirm();
  const id = useId();
  const close = () => setOpen(false);
  async function requestClose() {
    const dialog = ref.current;
    if (
      closeRequested.current ||
      dialog?.querySelector('[data-pending="true"]')
    )
      return;
    closeRequested.current = true;
    try {
      if (
        dialog?.querySelector('form[data-dirty="true"]') &&
        !(await confirm({
          title: "Buang perubahan?",
          description:
            "Isianmu belum disimpan. Jika ditutup, perubahan ini akan hilang.",
          confirmLabel: "Buang perubahan",
          cancelLabel: "Lanjut mengedit",
          variant: "destructive",
          container: dialog,
        }))
      )
        return;
      if (!dialog?.querySelector('[data-pending="true"]')) close();
    } finally {
      closeRequested.current = false;
    }
  }
  useEffect(() => {
    if (open) {
      ref.current?.showModal();
      ref.current
        ?.querySelector<HTMLElement>(
          'input:not([type="hidden"]), select, textarea',
        )
        ?.focus();
    } else if (ref.current?.open) {
      ref.current.close();
      triggerRef.current?.focus();
    }
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);
  return (
    <>
      <button
        ref={triggerRef}
        className={triggerClass}
        type="button"
        aria-haspopup="dialog"
        aria-label={triggerLabel}
        title={triggerLabel}
        onClick={() => setOpen(true)}
      >
        {trigger ?? (
          <>
            <Plus size={17} />
            {title}
          </>
        )}
      </button>
      <dialog
        ref={ref}
        className={["modal", dialogClassName].filter(Boolean).join(" ")}
        aria-labelledby={id}
        aria-describedby={description ? id + "-desc" : undefined}
        onCancel={(event) => {
          event.preventDefault();
          void requestClose();
        }}
        onClose={() => setOpen(false)}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            const bounds = e.currentTarget.getBoundingClientRect();
            if (
              e.clientX < bounds.left ||
              e.clientX > bounds.right ||
              e.clientY < bounds.top ||
              e.clientY > bounds.bottom
            )
              void requestClose();
          }
        }}
      >
        <header className="modal-header">
          <div>
            <span className="eyebrow">WORKSPACE PRIBADI</span>
            <h2 id={id}>{title}</h2>
          </div>
          <button
            className="icon-btn"
            type="button"
            aria-label="Tutup dialog"
            onClick={() => void requestClose()}
          >
            <X size={20} />
          </button>
        </header>
        {description && (
          <p className="muted modal-description" id={id + "-desc"}>
            {description}
          </p>
        )}
        {open && (
          <div className="modal-body">
            {typeof children === "function" ? children(close) : children}
          </div>
        )}
      </dialog>
    </>
  );
}
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <Inbox size={25} strokeWidth={1.5} />
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
export function MoneyInput({
  name,
  value = "",
  allowNegative = false,
  required = true,
  ...control
}: ControlProps & {
  name: string;
  value?: string;
  allowNegative?: boolean;
  required?: boolean;
}) {
  const initial = value ? BigInt(value).toLocaleString("id-ID") : "";
  const previous = useRef(initial);
  return (
    <div className="money-input">
      <span>Rp</span>
      <input
        {...control}
        name={name}
        type="text"
        defaultValue={initial}
        inputMode={allowNegative ? "text" : "numeric"}
        pattern={
          allowNegative ? "-?[0-9]+(\\.[0-9]{3})*" : "[0-9]+(\\.[0-9]{3})*"
        }
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        required={required}
        placeholder="0"
        maxLength={32}
        onChange={(event) => {
          const input = event.currentTarget;
          const raw = input.value;
          const position = input.selectionStart ?? raw.length;
          const formatted = formatMoneyInput(raw, allowNegative, position);
          if (!formatted) {
            input.value = previous.current;
            const caret = Math.max(
              0,
              Math.min(
                input.value.length,
                position - Math.max(0, raw.length - input.value.length),
              ),
            );
            input.setSelectionRange(caret, caret);
            event.stopPropagation();
            return;
          }
          if (formatted.value === previous.current) event.stopPropagation();
          input.value = formatted.value;
          previous.current = formatted.value;
          input.setSelectionRange(formatted.caret, formatted.caret);
        }}
        onPaste={(event) => {
          if (!isMoneyPaste(event.clipboardData.getData("text"), allowNegative))
            event.preventDefault();
        }}
        onKeyDown={(event) => {
          if (event.ctrlKey || event.metaKey || event.altKey) return;
          if (event.key === "." || event.key === ",") {
            event.preventDefault();
            return;
          }
          const input = event.currentTarget;
          const start = input.selectionStart;
          if (start === null || start !== input.selectionEnd) return;
          // Delete a digit in one press, rather than repeatedly re-inserting a separator.
          if (event.key === "Backspace" && input.value[start - 1] === ".")
            input.setSelectionRange(start - 1, start - 1);
          if (event.key === "Delete" && input.value[start] === ".")
            input.setSelectionRange(start + 1, start + 1);
        }}
        onBlur={(e) => {
          if (e.currentTarget.value === "-") e.currentTarget.value = "";
          if (e.currentTarget.value === "-0") e.currentTarget.value = "0";
          previous.current = e.currentTarget.value;
        }}
      />
    </div>
  );
}
