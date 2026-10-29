import "server-only";
import { z } from "zod";
import { supabaseConfig } from "@/lib/supabase/config";

export function reminderEmailConfig() {
  const supabase = supabaseConfig();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.REMINDER_EMAIL_FROM?.trim();
  const secret = process.env.CRON_SECRET?.trim();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (
    !supabase ||
    !serviceKey ||
    !apiKey ||
    !from ||
    !secret ||
    secret.length < 16 ||
    !appUrl
  )
    return null;
  if (
    /[\r\n]/.test(from) ||
    !z.email().safeParse(from.match(/<([^<>]+)>$/)?.[1] ?? from).success
  )
    return null;
  try {
    const parsed = new URL(appUrl);
    if (!["https:", "http:"].includes(parsed.protocol)) return null;
    return {
      supabaseUrl: supabase.url,
      serviceKey,
      apiKey,
      from,
      secret,
      origin: parsed.origin,
    };
  } catch {
    return null;
  }
}
