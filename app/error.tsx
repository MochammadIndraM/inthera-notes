"use client";
import Link from "next/link";
import { CircleAlert, RotateCcw } from "lucide-react";
export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="error-page">
      <CircleAlert size={36} />
      <h1>Data belum dapat dimuat.</h1>
      <p>
        Periksa koneksi, konfigurasi Supabase, dan pastikan migration database
        sudah dijalankan.
      </p>
      <button className="btn primary" onClick={reset}>
        <RotateCcw size={16} />
        Coba lagi
      </button>
      <Link className="text-link" href="/setup">
        Lihat panduan konfigurasi →
      </Link>
    </div>
  );
}
