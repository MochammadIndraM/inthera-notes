import Link from "next/link";
import {
  ArrowRight,
  Database,
  KeyRound,
  Layers,
  ShieldCheck,
} from "lucide-react";
import { Brand } from "@/components/app-shell";
export const metadata = { title: "Konfigurasi database" };
export default function Setup() {
  return (
    <main className="setup-page">
      <Link href="/">
        <Brand />
      </Link>
      <section className="setup-card">
        <span className="setup-icon">
          <Database size={32} strokeWidth={1.5} />
        </span>
        <span className="eyebrow">SELANGKAH MENUJU WORKSPACE-MU</span>
        <h1>Konfigurasi database diperlukan</h1>
        <p className="setup-lead">
          IntheraNotes sudah siap dihubungkan ke database pribadi Anda. Lengkapi
          pengaturan Supabase untuk mulai mencatat tugas dan keuangan.
        </p>
        <ol className="setup-steps">
          <li>
            <span>
              <Database size={19} />
            </span>
            <div>
              <h2>Siapkan project Supabase</h2>
              <p>Buat project PostgreSQL dengan email/password Auth aktif.</p>
            </div>
          </li>
          <li>
            <span>
              <KeyRound size={19} />
            </span>
            <div>
              <h2>Isi environment aplikasi</h2>
              <p>
                Salin <code>.env.example</code> ke <code>.env.local</code>, lalu
                isi URL project, publishable key atau anon key, dan origin
                aplikasi.
              </p>
            </div>
          </li>
          <li>
            <span>
              <Layers size={19} />
            </span>
            <div>
              <h2>Terapkan migration</h2>
              <p>
                Jalankan file{" "}
                <code>supabase/migrations/202610290001_initial.sql</code> dan
                atur redirect URL Auth sesuai README.
              </p>
            </div>
          </li>
          <li>
            <span>
              <ShieldCheck size={19} />
            </span>
            <div>
              <h2>Restart server, lalu buat akun</h2>
              <p>
                Data disimpan di Supabase dan terisolasi dengan Row Level
                Security.
              </p>
            </div>
          </li>
        </ol>
        <div className="notice">
          Belum ada data pengguna yang dimuat. Aplikasi tidak memakai transaksi
          atau saldo contoh.
        </div>
        <Link className="btn primary" href="/login">
          Periksa konfigurasi & masuk <ArrowRight size={16} />
        </Link>
        <p className="field-hint">
          Panduan lengkap tersedia di README.md pada root project.
        </p>
      </section>
      <p className="muted setup-footer">Rencanakan harimu. Pahami uangmu.</p>
    </main>
  );
}
