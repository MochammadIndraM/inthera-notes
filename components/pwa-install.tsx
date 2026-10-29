"use client";

import Image from "next/image";
import {
  ArrowDownToLine,
  Check,
  Download,
  Ellipsis,
  LoaderCircle,
  MonitorSmartphone,
  Share,
  ShieldCheck,
  Smartphone,
  WifiOff,
  Zap,
} from "lucide-react";
import { Modal } from "./ui";
import { usePwa } from "./pwa-provider";

function InstallationGuide() {
  const { platform, canInstall, installed, installing, feedback, install } =
    usePwa();
  return (
    <div className="pwa-install-guide">
      <div className="pwa-app-preview">
        <Image
          src="/icons/icon-192.png"
          alt=""
          width={72}
          height={72}
          unoptimized
          className="pwa-app-icon"
        />
        <div>
          <strong>
            IntheraNotes<span>.</span>
          </strong>
          <p>Rencanakan harimu. Pahami uangmu.</p>
          <span className="pwa-label">
            <ShieldCheck size={12} /> Workspace pribadi
          </span>
        </div>
      </div>
      <h3>Satu ketukan ke hal yang berarti.</h3>
      <p className="muted">
        Buka tugas dan keuangan langsung dari layar utama, dengan tampilan
        aplikasi yang lebih fokus.
      </p>
      <div className="pwa-benefits">
        <span>
          <Zap size={18} /> Akses langsung
        </span>
        <span>
          <MonitorSmartphone size={18} /> Tampilan penuh
        </span>
        <span>
          <ShieldCheck size={18} /> Akun yang sama
        </span>
      </div>
      {installed ? (
        <p className="notice success">
          <Check size={18} /> IntheraNotes sudah dipasang di perangkat ini.
        </p>
      ) : canInstall ? (
        <button
          type="button"
          className="btn primary pwa-install-primary"
          disabled={installing}
          onClick={() => void install()}
        >
          {installing ? (
            <LoaderCircle size={18} className="spin" />
          ) : (
            <Download size={18} />
          )}
          {installing ? "Menunggu browser…" : "Pasang sekarang"}
        </button>
      ) : (
        <div className="pwa-instructions">
          <strong>
            {platform.startsWith("ios")
              ? "Pasang melalui Safari"
              : "Pasang melalui menu browser"}
          </strong>
          {platform === "ios-other" && (
            <p>Buka alamat aplikasi ini di Safari terlebih dahulu.</p>
          )}
          <ol>
            {platform.startsWith("ios") ? (
              <>
                <li>
                  <span>
                    <Share size={16} /> Buka menu <b>Bagikan</b> di Safari.
                  </span>
                </li>
                <li>
                  <span>
                    <ArrowDownToLine size={16} /> Pilih{" "}
                    <b>Tambahkan ke Layar Utama</b> / <b>Add to Home Screen</b>.
                  </span>
                </li>
                <li>
                  Konfirmasi dengan mengetuk <b>Tambah</b>.
                </li>
              </>
            ) : (
              <>
                <li>
                  <span>
                    <Ellipsis size={16} /> Buka menu{" "}
                    {platform === "android"
                      ? "Chrome atau Edge"
                      : "browser Chrome atau Edge"}
                    .
                  </span>
                </li>
                <li>
                  Pilih <b>Instal aplikasi</b>, <b>Pasang</b>, atau{" "}
                  <b>Tambahkan ke layar utama</b>.
                </li>
                <li>
                  Konfirmasi pemasangan. Nama menu dapat berbeda sesuai browser.
                </li>
              </>
            )}
          </ol>
        </div>
      )}
      {feedback && (
        <p className="notice" role="status">
          {feedback}
        </p>
      )}
      <p className="pwa-offline-note">
        <WifiOff size={16} /> Koneksi internet diperlukan untuk memuat dan
        menyimpan tugas serta keuangan.
      </p>
    </div>
  );
}
export function InstallAppButton({
  className = "btn primary",
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const { installed } = usePwa();
  if (installed && compact) return null;
  return (
    <Modal
      title="Pasang IntheraNotes"
      triggerLabel={installed ? "Aplikasi terpasang" : "Pasang aplikasi"}
      triggerClass={className}
      trigger={
        <>
          <Download size={18} />
          <span>{installed ? "Aplikasi terpasang" : "Pasang aplikasi"}</span>
        </>
      }
    >
      <InstallationGuide />
    </Modal>
  );
}
export function PwaSettings() {
  const { installed, offlineReady } = usePwa();
  return (
    <section
      className="pwa-settings-card"
      id="install-app"
      aria-labelledby="pwa-settings-title"
    >
      <div className="pwa-settings-main">
        <Image
          src="/icons/icon-192.png"
          alt=""
          width={60}
          height={60}
          unoptimized
          className="pwa-app-icon"
        />
        <div>
          <span className="eyebrow">INTHERANOTES DI PERANGKATMU</span>
          <h2 id="pwa-settings-title">Lebih dekat dengan harimu.</h2>
          <p>
            Pasang sekali, buka langsung dari layar utama. Masuk dengan akun
            IntheraNotes yang sama.
          </p>
        </div>
      </div>
      <div className="pwa-settings-bottom">
        <span className="pwa-label">
          {installed ? <Check size={15} /> : <Smartphone size={15} />}
          {installed ? "Aplikasi terpasang" : "Tersedia untuk HP & desktop"}
        </span>
        {offlineReady && (
          <span className="pwa-label">
            <Check size={15} /> Halaman offline siap
          </span>
        )}
        <InstallAppButton className="btn primary small" />
      </div>
    </section>
  );
}
