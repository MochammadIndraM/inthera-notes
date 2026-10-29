import { AuthForm } from "@/components/auth-form";
import { AuthLayout } from "@/components/auth-layout";
import { requireUser } from "@/lib/supabase/server";
export const metadata = { title: "Password baru" };
export default async function ResetPassword() {
  await requireUser();
  return (
    <AuthLayout
      title="Buat password baru."
      description="Gunakan minimal 8 karakter dan simpan dengan aman."
    >
      <AuthForm mode="password" />
    </AuthLayout>
  );
}
