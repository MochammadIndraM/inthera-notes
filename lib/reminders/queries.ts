import "server-only";
import { cache } from "react";
import { requireUser } from "@/lib/supabase/server";
import { todayWib } from "@/lib/domain";
import type { ReminderState, ReminderPreferences, ReminderTask } from "./types";

export const getReminders = cache(async (): Promise<ReminderState> => {
  const { client, user } = await requireUser();
  const preference = await client
    .from("task_reminder_preferences")
    .select("in_app_enabled,email_enabled")
    .eq("user_id", user.id)
    .maybeSingle<ReminderPreferences>();
  const migrationRequired =
    !!preference.error && ["42P01", "PGRST205"].includes(preference.error.code);
  const preferences = preference.data ?? {
    in_app_enabled: true,
    email_enabled: false,
  };
  const base = {
    preferences,
    migrationRequired,
    unavailable: !!preference.error && !migrationRequired,
    dueCount: 0,
    overdueCount: 0,
    tasks: [] as ReminderTask[],
  };
  if (!preferences.in_app_enabled) return base;
  const today = todayWib();
  const [tasks, due] = await Promise.all([
    client
      .from("tasks")
      .select("id,title,due_date", { count: "exact" })
      .eq("user_id", user.id)
      .neq("status", "done")
      .lte("due_date", today)
      .order("due_date")
      .order("id")
      .limit(8)
      .returns<ReminderTask[]>(),
    client
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .neq("status", "done")
      .eq("due_date", today),
  ]);
  if (tasks.error || due.error) return { ...base, unavailable: true };
  return {
    ...base,
    tasks: tasks.data ?? [],
    dueCount: due.count ?? 0,
    overdueCount: (tasks.count ?? 0) - (due.count ?? 0),
  };
});
