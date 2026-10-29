import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/domain";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const client = await createClient();
  const code = params.get("code");
  const token_hash = params.get("token_hash");
  const type = params.get("type");
  const next =
    params.get("next") === "/reset-password"
      ? "/reset-password"
      : safeNext(params.get("next"));
  if (code) {
    const { error } = await client.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, request.url));
  } else if (
    token_hash &&
    type &&
    ["signup", "recovery", "email"].includes(type)
  ) {
    const { error } = await client.auth.verifyOtp({
      token_hash,
      type: type as EmailOtpType,
    });
    if (!error)
      return NextResponse.redirect(
        new URL(type === "recovery" ? "/reset-password" : next, request.url),
      );
  }
  return NextResponse.redirect(
    new URL("/login?error=verification", request.url),
  );
}
