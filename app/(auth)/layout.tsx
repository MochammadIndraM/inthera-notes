import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfig } from "@/lib/supabase/config";
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!supabaseConfig()) redirect("/setup");
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (user) redirect("/dashboard");
  return children;
}
