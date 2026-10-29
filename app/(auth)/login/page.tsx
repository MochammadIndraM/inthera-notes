import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { AuthLayout } from "@/components/auth-layout";
import type { SearchParams } from "@/lib/types";
import { safeNext } from "@/lib/domain";
export const metadata = { title: "Masuk" };
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  return (
    <AuthLayout
      title="Senang bertemu kembali."
      description="Masuk dan lanjutkan hal-hal yang berarti untukmu."
    >
      {params.error && (
        <p className="notice danger" role="alert">
          Tautan verifikasi tidak valid atau sudah kedaluwarsa. Minta tautan
          baru atau coba masuk.
        </p>
      )}
      <AuthForm mode="login" next={safeNext(params.next)} />
      <p className="auth-switch">
        Belum punya akun?{" "}
        <Link href="/register">
          Mulai di sini <span aria-hidden>→</span>
        </Link>
      </p>
    </AuthLayout>
  );
}
