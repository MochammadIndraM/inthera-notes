import Link from "next/link";
export default function NotFound() {
  return (
    <main className="error-page">
      <span className="eyebrow">404</span>
      <h1>Halaman ini belum ditemukan.</h1>
      <p>Kembali ke workspace untuk melanjutkan catatanmu.</p>
      <Link href="/" className="btn primary">
        Kembali ke workspace
      </Link>
    </main>
  );
}
