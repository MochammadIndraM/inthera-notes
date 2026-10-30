"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { CircleAlert } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";

export type ConfirmationOptions = {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "destructive";
  container?: HTMLDialogElement | null;
};
type Confirmation = ConfirmationOptions & {
  resolve(value: boolean): void;
  origin: HTMLElement | null;
};
const ConfirmContext = createContext<
  ((options: ConfirmationOptions) => Promise<boolean>) | null
>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<Confirmation | null>(null);
  const pending = useRef<Confirmation | null>(null);
  const pathname = usePathname();

  const finish = useCallback((accepted: boolean) => {
    const current = pending.current;
    if (!current) return;
    pending.current = null;
    setRequest(null);
    const sourceExists = !current.origin || current.origin.isConnected;
    current.resolve(accepted && sourceExists);
  }, []);
  const confirm = useCallback((options: ConfirmationOptions) => {
    if (pending.current) return Promise.resolve(false);
    return new Promise<boolean>((resolve) => {
      const origin =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      // A portal inside an open native dialog remains in the browser's top layer.
      const container =
        options.container ??
        origin?.closest<HTMLDialogElement>("dialog[open]") ??
        undefined;
      const next = { ...options, container, origin, resolve };
      pending.current = next;
      setRequest(next);
    });
  }, []);

  useEffect(() => () => finish(false), [pathname, finish]);
  useEffect(() => {
    function beforeUnload(event: BeforeUnloadEvent) {
      if (
        document.querySelector('form[data-dirty="true"], [data-pending="true"]')
      ) {
        event.preventDefault();
        event.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AlertDialog
        open={!!request}
        onOpenChange={(open) => {
          if (!open) finish(false);
        }}
      >
        {request && (
          <AlertDialogContent
            container={request.container}
            onEscapeKeyDown={(event) => {
              event.preventDefault();
              finish(false);
            }}
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              const origin = request.origin;
              const dialog = origin?.closest<HTMLDialogElement>("dialog");
              if (origin?.isConnected && (!dialog || dialog.open))
                origin.focus({ preventScroll: true });
            }}
          >
            <AlertDialogHeader>
              <span
                className="alert-dialog-icon"
                data-variant={request.variant ?? "default"}
                aria-hidden="true"
              >
                <CircleAlert size={23} />
              </span>
              <AlertDialogTitle>{request.title}</AlertDialogTitle>
              <AlertDialogDescription>
                {request.description}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => finish(false)}>
                {request.cancelLabel ?? "Batal"}
              </AlertDialogCancel>
              <AlertDialogAction
                variant={request.variant}
                onClick={() => finish(true)}
              >
                {request.confirmLabel ?? "Lanjutkan"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        )}
      </AlertDialog>
    </ConfirmContext.Provider>
  );
}
export function useConfirm() {
  const confirm = useContext(ConfirmContext);
  if (!confirm)
    throw new Error("Confirmation controls require ConfirmProvider");
  return confirm;
}
