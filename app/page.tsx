import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfig } from "@/lib/supabase/config";

export default async function Home() {
  if (!supabaseConfig()) redirect("/setup");
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  redirect(user ? "/dashboard" : "/login");
}
