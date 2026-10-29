"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { Download, LoaderCircle, RefreshCw, WifiOff, X } from "lucide-react";
import { usePathname } from "next/navigation";

interface InstallPrompt extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}
type Platform = "ios" | "ios-other" | "android" | "desktop";
type PwaContextValue = {
  online: boolean;
  installed: boolean;
  platform: Platform;
  canInstall: boolean;
  installing: boolean;
  feedback: string;
  offlineReady: boolean;
  install(): Promise<void>;
};
const PwaContext = createContext<PwaContextValue | null>(null);
function subscribeOnline(listener: () => void) {
  window.addEventListener("online", listener);
  window.addEventListener("offline", listener);
  return () => {
    window.removeEventListener("online", listener);
    window.removeEventListener("offline", listener);
  };
}
function subscribeDisplay(listener: () => void) {
  const media = window.matchMedia("(display-mode: standalone)");
  media.addEventListener("change", listener);
  return () => media.removeEventListener("change", listener);
}
function getStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}
const subscribePlatform = () => () => {};
function getPlatform(): Platform {
  const ua = navigator.userAgent;
  const ios =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (ios) return /CriOS|FxiOS|EdgiOS/.test(ua) ? "ios-other" : "ios";
  return /Android/.test(ua) ? "android" : "desktop";
}

export function PwaProvider({ children }: { children: ReactNode }) {
  const online = useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true,
  );
  const standalone = useSyncExternalStore(
    subscribeDisplay,
    getStandalone,
    () => false,
  );
  const platform = useSyncExternalStore(
    subscribePlatform,
    getPlatform,
    (): Platform => "desktop",
  );
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [justInstalled, setJustInstalled] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [offlineReady, setOfflineReady] = useState(false);
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  const [updating, setUpdating] = useState(false);
  const [updateMessage, setUpdateMessage] = useState("");
  const reloadForUpdate = useRef(false);
  const installed = standalone || justInstalled;

  useEffect(() => {
    function available(event: Event) {
      event.preventDefault();
      setPrompt(event as InstallPrompt);
      setFeedback("");
    }
    function complete() {
      setJustInstalled(true);
      setPrompt(null);
      setFeedback(
        "IntheraNotes berhasil dipasang. Buka melalui ikon di perangkatmu.",
      );
    }
    window.addEventListener("beforeinstallprompt", available);
    window.addEventListener("appinstalled", complete);
    return () => {
      window.removeEventListener("beforeinstallprompt", available);
      window.removeEventListener("appinstalled", complete);
    };
  }, []);

  useEffect(() => {
    if (
      process.env.NODE_ENV !== "production" ||
      !window.isSecureContext ||
      !("serviceWorker" in navigator)
    )
      return;
    let disposed = false;
    let registration: ServiceWorkerRegistration | undefined;
    let installingWorker: ServiceWorker | null = null;
    const changed = () => {
      if (
        installingWorker?.state === "installed" &&
        navigator.serviceWorker.controller &&
        !disposed
      ) {
        setWaiting(registration?.waiting ?? null);
      }
    };
    const found = () => {
      installingWorker?.removeEventListener("statechange", changed);
      installingWorker = registration?.installing ?? null;
      installingWorker?.addEventListener("statechange", changed);
    };
    const controllerChanged = () => {
      if (reloadForUpdate.current) {
        document
          .querySelectorAll<HTMLFormElement>('form[data-dirty="true"]')
          .forEach((form) => {
            form.dataset.dirty = "false";
          });
        window.location.reload();
      } else setWaiting(null);
    };
    const check = () => {
      if (document.visibilityState === "visible" && navigator.onLine)
        void registration?.update().catch(() => {});
    };
    navigator.serviceWorker.addEventListener(
      "controllerchange",
      controllerChanged,
    );
    document.addEventListener("visibilitychange", check);
    window.addEventListener("online", check);
    void (async () => {
      try {
        const registered = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        });
        if (disposed) return;
        registration = registered;
        setWaiting(registration.waiting);
        registration.addEventListener("updatefound", found);
        found();
        await navigator.serviceWorker.ready;
        if (!disposed) setOfflineReady(true);
      } catch {
        // Installation and the online app remain usable if the worker is unavailable.
      }
    })();
    return () => {
      disposed = true;
      registration?.removeEventListener("updatefound", found);
      installingWorker?.removeEventListener("statechange", changed);
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        controllerChanged,
      );
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("online", check);
    };
  }, []);

  useEffect(() => {
    if (!updating) return;
    const timer = window.setTimeout(() => {
      reloadForUpdate.current = false;
      setUpdating(false);
      setUpdateMessage(
        "Pembaruan belum selesai. Periksa koneksi lalu coba kembali.",
      );
    }, 20000);
    return () => window.clearTimeout(timer);
  }, [updating]);

  async function install() {
    if (!prompt || installing) return;
    setInstalling(true);
    setFeedback("");
    try {
      await prompt.prompt();
      const { outcome } = await prompt.userChoice;
      setFeedback(
        outcome === "accepted"
          ? "Pemasangan disetujui. Ikuti proses dari browsermu."
          : "Kamu bisa memasangnya lagi melalui menu browser kapan saja.",
      );
    } catch {
      setFeedback(
        "Pemasangan belum tersedia. Ikuti panduan menu browser di bawah.",
      );
    } finally {
      setPrompt(null);
      setInstalling(false);
    }
  }
  function update() {
    if (!waiting || updating) return;
    if (document.querySelector('form[data-pending="true"]')) {
      setUpdateMessage("Tunggu sampai proses penyimpanan selesai.");
      return;
    }
    if (
      document.querySelector('form[data-dirty="true"]') &&
      !window.confirm(
        "Ada isian yang belum disimpan. Muat ulang dan abaikan isian tersebut?",
      )
    )
      return;
    reloadForUpdate.current = true;
    setUpdating(true);
    try {
      if (waiting.state === "activated") {
        document
          .querySelectorAll<HTMLFormElement>('form[data-dirty="true"]')
          .forEach((form) => {
            form.dataset.dirty = "false";
          });
        window.location.reload();
      } else waiting.postMessage({ type: "SKIP_WAITING" });
    } catch {
      reloadForUpdate.current = false;
      setUpdating(false);
      setUpdateMessage(
        "Pembaruan belum tersedia. Muat ulang setelah menyimpan isianmu.",
      );
    }
  }
  return (
    <PwaContext.Provider
      value={{
        online,
        installed,
        platform,
        canInstall: !!prompt && !installed,
        installing,
        feedback,
        offlineReady,
        install,
      }}
    >
      {children}
      <div className="pwa-status-stack">
        {!online && (
          <div className="pwa-status-card pwa-status-offline" role="status">
            <WifiOff size={21} aria-hidden="true" />
            <div>
              <strong>Koneksi terputus</strong>
              <p>
                Sambungkan internet untuk menyimpan perubahan. Isian tetap
                tersedia di halaman ini.
              </p>
            </div>
          </div>
        )}
        {waiting && online && (
          <div className="pwa-status-card" role="status">
            <RefreshCw size={21} aria-hidden="true" />
            <div>
              <strong>Versi baru sudah siap</strong>
              <p>
                {updateMessage ||
                  "Perbarui untuk menikmati IntheraNotes terbaru."}
              </p>
              <button
                className="btn primary small"
                type="button"
                disabled={updating}
                onClick={update}
              >
                {updating ? (
                  <LoaderCircle size={15} className="spin" />
                ) : (
                  <RefreshCw size={15} />
                )}
                {updating ? "Memperbarui…" : "Perbarui aplikasi"}
              </button>
            </div>
          </div>
        )}
      </div>
    </PwaContext.Provider>
  );
}
export function usePwa() {
  const context = useContext(PwaContext);
  if (!context) throw new Error("PWA controls require PwaProvider");
  return context;
}

const DISMISS_KEY = "inthera-install-dismissed-until";
function subscribeDismissal(listener: () => void) {
  window.addEventListener("storage", listener);
  window.addEventListener("inthera-install-dismissed", listener);
  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener("inthera-install-dismissed", listener);
  };
}
function dismissalActive() {
  try {
    return Number(localStorage.getItem(DISMISS_KEY)) > Date.now();
  } catch {
    return false;
  }
}
export function PwaInstallBanner({ children }: { children: ReactNode }) {
  const { canInstall, installed, platform } = usePwa();
  const dismissed = useSyncExternalStore(
    subscribeDismissal,
    dismissalActive,
    () => true,
  );
  const [hidden, setHidden] = useState(false);
  const path = usePathname();
  if (
    installed ||
    dismissed ||
    hidden ||
    path === "/settings" ||
    (!canInstall && platform !== "ios" && platform !== "ios-other")
  )
    return null;
  return (
    <section
      className="pwa-install-banner"
      aria-label="Pasang aplikasi IntheraNotes"
    >
      <span className="pwa-banner-icon">
        <Download size={22} />
      </span>
      <div className="pwa-banner-copy">
        <strong>Ruang pribadimu, satu ketukan saja.</strong>
        <p>Pasang IntheraNotes di layar utama untuk akses lebih cepat.</p>
      </div>
      {children}
      <button
        className="icon-btn pwa-banner-dismiss"
        type="button"
        aria-label="Ingatkan pemasangan nanti"
        onClick={() => {
          setHidden(true);
          try {
            localStorage.setItem(
              DISMISS_KEY,
              String(Date.now() + 7 * 86400000),
            );
          } catch {
            /* Dismiss for this visit. */
          }
          window.dispatchEvent(new Event("inthera-install-dismissed"));
        }}
      >
        <X size={16} />
      </button>
    </section>
  );
}
