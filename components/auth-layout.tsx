import { Check, CircleCheck, ShieldCheck, Wallet } from "lucide-react";
import Link from "next/link";
import { Brand } from "./app-shell";
import { InstallAppButton } from "./pwa-install";
import type { ReactNode } from "react";

export function AuthLayout({
  children,
  title,
  description,
}: {
  children: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="auth-page">
      <aside className="auth-story">
        <Link href="/login">
          <Brand />
        </Link>
        <div className="auth-story-content">
          <span className="eyebrow">LEBIH TERATUR. LEBIH TENANG.</span>
          <h1>
            Hari yang terarah.
            <br />
            Keuangan yang
            <br />
            <em>lebih dipahami.</em>
          </h1>
          <p>
            Satu ruang pribadi untuk rencana harian dan setiap rupiah yang
            berarti.
          </p>
          <div className="auth-visual">
            <div className="auth-mini-card">
              <span className="metric-icon violet">
                <CircleCheck size={22} />
              </span>
              <div>
                <strong>Satu tugas, satu langkah.</strong>
                <span>Beri ruang untuk prioritasmu.</span>
              </div>
              <Check size={18} className="income-text" />
            </div>
            <div className="auth-mini-card">
              <span className="metric-icon green">
                <Wallet size={22} />
              </span>
              <div>
                <strong>Kenali arah uangmu.</strong>
                <span>Catat hari ini, pahami esok.</span>
              </div>
              <Check size={18} className="income-text" />
            </div>
          </div>
        </div>
        <p className="auth-privacy">
          <ShieldCheck size={16} />
          Workspace pribadi. Data tetap milikmu.
        </p>
      </aside>
      <main className="auth-main">
        <div className="auth-mobile-brand">
          <Brand />
        </div>
        <div className="auth-form-card">
          <span className="eyebrow">SELAMAT DATANG DI INTHERANOTES</span>
          <h2>{title}</h2>
          <p className="muted auth-description">{description}</p>
          {children}
        </div>
        <div className="auth-footer">
          <p>Rencanakan harimu. Pahami uangmu.</p>
          <InstallAppButton className="pwa-auth-install" compact />
        </div>
      </main>
    </div>
  );
}
