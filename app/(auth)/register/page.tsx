import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { AuthLayout } from "@/components/auth-layout";
export const metadata = { title: "Buat akun" };
export default function Register() {
  return (
    <AuthLayout
      title="Mulai langkah pertamamu."
      description="Buat ruang pribadi untuk hari yang lebih terarah."
    >
      <AuthForm mode="register" />
      <p className="auth-switch">
        Sudah punya akun? <Link href="/login">Masuk ke workspace →</Link>
      </p>
      <p className="field-hint">
        Verifikasi email mungkin diperlukan sebelum masuk, sesuai pengaturan
        akun.
      </p>
    </AuthLayout>
  );
}
