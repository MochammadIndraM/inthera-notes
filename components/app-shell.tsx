"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowLeftRight,
  CalendarCheck,
  CalendarDays,
  ChartNoAxesCombined,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  CreditCard,
  FolderClosed,
  House,
  LogOut,
  Menu,
  NotebookPen,
  PanelLeftClose,
  Settings2,
  ShieldCheck,
  Sparkles,
  Wallet,
  X,
} from "lucide-react";
import type { Workspace } from "@/lib/types";
import { signOut } from "@/lib/actions/auth";
import { ActionButton } from "./record-actions";
import { TaskEditor, TransactionEditor } from "./record-forms";
import { TaskReminders } from "./task-reminders";
import { InstallAppButton } from "./pwa-install";
import { PwaInstallBanner } from "./pwa-provider";

export const navigation = [
  { label: "Dashboard", href: "/dashboard", icon: House, group: "WORKSPACE" },
  {
    label: "Semua tugas",
    href: "/tasks",
    icon: CircleCheck,
    group: "PRODUKTIVITAS",
  },
  { label: "Hari ini", href: "/tasks/today", icon: CalendarCheck },
  { label: "Mendatang", href: "/tasks/upcoming", icon: CalendarDays },
  { label: "Proyek", href: "/tasks/projects", icon: FolderClosed },
  {
    label: "Ringkasan",
    href: "/finance",
    icon: ChartNoAxesCombined,
    group: "KEUANGAN",
  },
  { label: "Transaksi", href: "/finance/transactions", icon: ArrowLeftRight },
  { label: "Akun keuangan", href: "/finance/accounts", icon: Wallet },
  { label: "Anggaran", href: "/finance/budgets", icon: CreditCard },
  { label: "Laporan", href: "/finance/reports", icon: ChartNoAxesCombined },
];
export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <span className="brand">
      <span className="brand-icon">
        <NotebookPen size={23} strokeWidth={1.8} />
      </span>
      {!compact && (
        <span>
          Inthera<span className="brand-light">Notes</span>
          <span className="brand-dot">.</span>
        </span>
      )}
    </span>
  );
}
export function applyTheme(theme: string) {
  const dark =
    theme === "dark" ||
    (theme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  try {
    localStorage.setItem("inthera-theme", theme);
  } catch {
    /* Storage can be disabled. */
  }
}
export function AppShell({
  workspace,
  children,
}: {
  workspace: Workspace;
  children: ReactNode;
}) {
  const path = usePathname();
  const [drawer, setDrawer] = useState(false);
  const drawerRef = useRef<HTMLDialogElement>(null);
  const [collapsed, setCollapsed] = useState(false);
  const name = workspace.profile.display_name?.trim() || "Workspace saya";
  const title =
    path === "/settings"
      ? "Pengaturan"
      : (navigation.find((n) => n.href === path)?.label ?? "Workspace");
  useEffect(() => {
    if (drawer) drawerRef.current?.showModal();
    else drawerRef.current?.close();
    if (!drawer) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [drawer]);
  useEffect(() => {
    applyTheme(workspace.profile.theme);
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = () => applyTheme(workspace.profile.theme);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [workspace.profile.theme]);
  const sideContent = (
    <>
      <Link
        href="/dashboard"
        className="brand-link"
        aria-label="IntheraNotes — Dashboard"
      >
        <Brand compact={collapsed && !drawer} />
      </Link>
      <div className="workspace-pill">
        <span className="workspace-avatar">
          {name.slice(0, 1).toUpperCase()}
        </span>
        <div>
          <strong>Workspace pribadi</strong>
          <span>Tempat untuk bertumbuh</span>
        </div>
        <ChevronDown size={14} />
      </div>
      <nav aria-label="Navigasi utama" className="main-nav">
        {navigation.map(({ label, href, icon: Icon, group }) => (
          <div key={href}>
            {group && <p className="nav-group">{group}</p>}
            <Link
              href={href}
              title={label}
              aria-current={path === href ? "page" : undefined}
              className={"nav-item " + (path === href ? "active" : "")}
              onClick={() => setDrawer(false)}
            >
              <Icon size={19} strokeWidth={1.7} />
              <span>{label}</span>
              {path === href && <span className="active-dot" />}
            </Link>
          </div>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <div className="sidebar-note">
          <Sparkles size={20} />
          <strong>
            Sedikit lebih teratur,
            <br />
            setiap hari.
          </strong>
          <p>Rencana kecil. Langkah berarti.</p>
        </div>
        <Link
          href="/settings"
          className={"nav-item " + (path === "/settings" ? "active" : "")}
          onClick={() => setDrawer(false)}
        >
          <Settings2 size={19} />
          <span>Pengaturan</span>
        </Link>
        <InstallAppButton className="nav-item pwa-nav-install" compact />
        <div className="sidebar-profile">
          <span className="avatar">{name.slice(0, 2).toUpperCase()}</span>
          <Link href="/settings" onClick={() => setDrawer(false)}>
            <strong>{name}</strong>
            <span>Akun personal</span>
          </Link>
          <ActionButton action={signOut} className="icon-btn" label="Keluar">
            <LogOut size={17} />
          </ActionButton>
        </div>
      </div>
    </>
  );
  return (
    <div className={"app-shell " + (collapsed ? "sidebar-collapsed" : "")}>
      <a className="skip-link" href="#main-content">
        Lewati ke konten
      </a>
      <aside className="sidebar desktop-sidebar">
        {sideContent}
        <button
          className="collapse-button icon-btn"
          aria-label={collapsed ? "Perluas sidebar" : "Ciutkan sidebar"}
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </aside>
      <dialog
        ref={drawerRef}
        className="mobile-drawer"
        aria-label="Menu seluler"
        onCancel={() => setDrawer(false)}
        onClose={() => setDrawer(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            const bounds = event.currentTarget.getBoundingClientRect();
            if (event.clientX > bounds.right) setDrawer(false);
          }
        }}
      >
        <aside className="sidebar mobile-sidebar">
          <button
            autoFocus
            className="drawer-close icon-btn"
            aria-label="Tutup menu"
            onClick={() => setDrawer(false)}
          >
            <X size={19} />
          </button>
          {drawer && sideContent}
        </aside>
      </dialog>
      <div className="app-main">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-btn mobile-menu"
              onClick={() => setDrawer(true)}
              aria-label="Buka menu"
            >
              <Menu size={21} />
            </button>
            <PanelLeftClose className="desktop-only muted" size={18} />
            <span className="desktop-only muted">Workspace</span>
            <ChevronRight size={14} className="muted desktop-only" />
            <strong>{title}</strong>
          </div>
          <div className="topbar-actions">
            {workspace.reminders && (
              <TaskReminders
                state={workspace.reminders}
                today={workspace.today}
              />
            )}
            <span className="private-label">
              <ShieldCheck size={14} />
              Pribadi & aman
            </span>
            <div className="quick-add">
              <TaskEditor
                projects={workspace.projects}
                trigger={
                  <>
                    + <span>Tugas</span>
                  </>
                }
                triggerClass="btn secondary small"
              />
              <TransactionEditor
                workspace={workspace}
                trigger={
                  <>
                    + <span>Transaksi</span>
                  </>
                }
                triggerClass="btn primary small"
              />
            </div>
            <Link
              className="avatar small-avatar"
              href="/settings"
              aria-label="Buka profil"
            >
              {name.slice(0, 2).toUpperCase()}
            </Link>
          </div>
        </header>
        <main id="main-content" className="page-content">
          <PwaInstallBanner>
            <InstallAppButton className="btn primary small" />
          </PwaInstallBanner>
          {children}
        </main>
        <footer className="page-footer">
          <span>
            IntheraNotes <span className="footer-dot">·</span> Ruang untuk
            rencana dan keuanganmu.
          </span>
          <span>
            IDR <span className="footer-dot">·</span> Asia/Jakarta
          </span>
        </footer>
      </div>
      <nav className="bottom-nav" aria-label="Navigasi cepat seluler">
        {[
          { href: "/dashboard", label: "Dashboard", icon: House },
          { href: "/tasks", label: "Tugas", icon: CircleCheck },
          { href: "/finance", label: "Keuangan", icon: Wallet },
        ].map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={path.startsWith(href) ? "active" : ""}
            aria-current={path === href ? "page" : undefined}
          >
            <Icon size={20} />
            <span>{label}</span>
          </Link>
        ))}
        <button onClick={() => setDrawer(true)}>
          <Menu size={20} />
          <span>Lainnya</span>
        </button>
      </nav>
    </div>
  );
}
