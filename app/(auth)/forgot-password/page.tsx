import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { AuthLayout } from "@/components/auth-layout";
export const metadata = { title: "Pulihkan password" };
export default function ForgotPassword() {
  return (
    <AuthLayout
      title="Kembali ke ruangmu."
      description="Masukkan email untuk menerima tautan pemulihan password."
    >
      <AuthForm mode="reset" />
      <Link href="/login" className="text-link auth-switch">
        ← Kembali masuk
      </Link>
    </AuthLayout>
  );
}
