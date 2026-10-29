import "server-only";
import { cache } from "react";
import { z } from "zod";
import { requireUser } from "@/lib/supabase/server";
import { monthRange, nextDay, todayWib, validDate } from "@/lib/domain";
import type {
  Account,
  Budget,
  Category,
  Profile,
  Project,
  SearchParams,
  Summary,
  Task,
  Transaction,
  Workspace,
} from "./types";

export const TRANSACTION_FIELDS =
  "id,type,amount,transaction_date,account_id,from_account_id,to_account_id,category_id,title,notes,category_name,account_name,from_account_name,to_account_name";
export const stringParam = (
  params: SearchParams,
  key: string,
  fallback = "",
) => (typeof params[key] === "string" ? (params[key] as string) : fallback);
export function pageNumber(params: SearchParams) {
  const value = Number(stringParam(params, "page", "1"));
  return Number.isInteger(value) ? Math.max(1, Math.min(100000, value)) : 1;
}
export function period(params: SearchParams) {
  const month = stringParam(params, "month", todayWib().slice(0, 7));
  let range;
  try {
    range = monthRange(month);
  } catch {
    range = monthRange(todayWib().slice(0, 7));
  }
  const start = stringParam(params, "start");
  const end = stringParam(params, "end");
  if (
    validDate(start) &&
    validDate(end) &&
    start <= end &&
    end < "9999-12-31" &&
    (Date.parse(end) - Date.parse(start)) / 86400000 <= 366
  )
    range = { start, end: nextDay(end) };
  return range;
}
export const getWorkspace = cache(async (): Promise<Workspace> => {
  const { client, user } = await requireUser();
  const results = await Promise.all([
    client
      .from("profiles")
      .select("id,display_name,theme")
      .eq("id", user.id)
      .single<Profile>(),
    client
      .from("account_balances")
      .select("id,name,type,opening_balance,opened_on,is_archived,balance")
      .eq("user_id", user.id)
      .order("name")
      .returns<Account[]>(),
    client
      .from("financial_categories")
      .select("id,name,type,is_archived")
      .eq("user_id", user.id)
      .order("name")
      .returns<Category[]>(),
    client
      .from("projects")
      .select("id,name,description,color,is_archived")
      .eq("user_id", user.id)
      .order("created_at")
      .returns<Project[]>(),
  ]);
  if (results.some((result) => result.error || !result.data))
    throw new Error(
      "Database belum dapat dimuat. Periksa koneksi dan pastikan migration IntheraNotes sudah diterapkan.",
    );
  return {
    today: todayWib(),
    profile: results[0].data!,
    accounts: results[1].data!,
    categories: results[2].data!,
    projects: results[3].data!,
  };
});
export async function getSummary(start: string, end: string) {
  const { client } = await requireUser();
  const { data, error } = await client.rpc("workspace_summary", {
    p_start: start,
    p_end: end,
  });
  if (error || !data)
    throw new Error(
      "Ringkasan belum dapat dimuat. Periksa koneksi dan migration database.",
    );
  return data as Summary;
}
export async function getTasks(params: SearchParams, view = "all", limit = 25) {
  const { client, user } = await requireUser();
  const today = todayWib();
  const page = pageNumber(params);
  let query = client
    .from("tasks")
    .select(
      "id,title,description,status,priority,due_date,project_id,completed_at",
      { count: "exact" },
    )
    .eq("user_id", user.id);
  if (view === "today" || view === "focus")
    query = query.neq("status", "done").lte("due_date", today);
  if (view === "upcoming")
    query = query.neq("status", "done").gt("due_date", today);
  const status = stringParam(params, "status");
  if (["todo", "in_progress", "done"].includes(status))
    query = query.eq("status", status);
  if (status === "active") query = query.neq("status", "done");
  if (status === "overdue")
    query = query.neq("status", "done").lt("due_date", today);
  if (status === "undated")
    query = query.is("due_date", null).neq("status", "done");
  const priority = stringParam(params, "priority");
  if (["low", "medium", "high"].includes(priority))
    query = query.eq("priority", priority);
  const project = stringParam(params, "project");
  if (z.uuid().safeParse(project).success)
    query = query.eq("project_id", project);
  const due = stringParam(params, "due");
  if (validDate(due)) query = query.eq("due_date", due);
  const q = stringParam(params, "q")
    .trim()
    .slice(0, 160)
    .replace(/[\\%_]/g, "\\$&");
  if (q) query = query.ilike("title", "%" + q + "%");
  const newest = stringParam(params, "sort") === "newest";
  query = query
    .order(newest ? "created_at" : "due_date", {
      ascending: !newest,
      nullsFirst: false,
    })
    .order("id");
  const { data, count, error } = await query
    .range((page - 1) * limit, page * limit - 1)
    .returns<Task[]>();
  if (error) throw new Error("Tugas belum dapat dimuat. Coba kembali.");
  return { data: data ?? [], count: count ?? 0, page, limit };
}
export async function transactionQuery(params: SearchParams) {
  const { client, user } = await requireUser();
  const { start, end } = period(params);
  let query = client
    .from("transaction_records")
    .select(TRANSACTION_FIELDS, { count: "exact" })
    .eq("user_id", user.id)
    .gte("transaction_date", start)
    .lt("transaction_date", end);
  const type = stringParam(params, "type");
  if (["income", "expense", "transfer"].includes(type))
    query = query.eq("type", type);
  const account = stringParam(params, "account");
  if (z.uuid().safeParse(account).success)
    query = query.or(
      `account_id.eq.${account},from_account_id.eq.${account},to_account_id.eq.${account}`,
    );
  const category = stringParam(params, "category");
  if (z.uuid().safeParse(category).success)
    query = query.eq("category_id", category);
  const q = stringParam(params, "q")
    .trim()
    .slice(0, 160)
    .replace(/[\\%_]/g, "\\$&");
  if (q) query = query.ilike("search_text", "%" + q + "%");
  const sort = stringParam(params, "sort");
  query = query
    .order(
      sort === "largest" || sort === "smallest"
        ? "sort_amount"
        : "transaction_date",
      { ascending: sort === "oldest" || sort === "smallest" },
    )
    .order("id");
  // Wrap thenable PostgREST builder so it is not executed until pagination is applied.
  return { query };
}
export async function getTransactions(params: SearchParams, limit = 25) {
  const { query } = await transactionQuery(params);
  const page = pageNumber(params);
  const { data, count, error } = await query
    .range((page - 1) * limit, page * limit - 1)
    .returns<Transaction[]>();
  if (error) throw new Error("Transaksi belum dapat dimuat. Coba kembali.");
  return { data: data ?? [], count: count ?? 0, page, limit };
}
export async function getRecentTransactions(limit = 5) {
  const { client, user } = await requireUser();
  const { data, error } = await client
    .from("transaction_records")
    .select(TRANSACTION_FIELDS)
    .eq("user_id", user.id)
    .order("transaction_date", { ascending: false })
    .order("id")
    .limit(limit)
    .returns<Transaction[]>();
  if (error) throw new Error("Transaksi terbaru belum dapat dimuat.");
  return data ?? [];
}
export async function getBudgets(month: string) {
  const { client, user } = await requireUser();
  const { data, error } = await client
    .from("budget_usage")
    .select("id,category_id,category_name,month,limit_amount,spent")
    .eq("user_id", user.id)
    .eq("month", month)
    .order("category_name")
    .returns<Budget[]>();
  if (error) throw new Error("Anggaran belum dapat dimuat.");
  return data ?? [];
}
