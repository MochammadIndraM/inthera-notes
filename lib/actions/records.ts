"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  accountSchema,
  budgetSchema,
  categorySchema,
  idSchema,
  projectSchema,
  taskSchema,
  transactionSchema,
  validationErrors,
} from "@/lib/validation";
import type { ActionResult } from "@/lib/types";

const entities = {
  task: { table: "tasks", schema: taskSchema },
  transaction: { table: "financial_transactions", schema: transactionSchema },
  account: { table: "financial_accounts", schema: accountSchema },
  category: { table: "financial_categories", schema: categorySchema },
  project: { table: "projects", schema: projectSchema },
  budget: { table: "budgets", schema: budgetSchema },
};
export type Entity = keyof typeof entities;
function refresh(entity: Entity) {
  revalidatePath("/dashboard");
  if (entity === "task" || entity === "project")
    revalidatePath("/tasks", "layout");
  else {
    revalidatePath("/finance", "layout");
    revalidatePath("/settings");
  }
}
function databaseError(code: string): ActionResult {
  return {
    ok: false,
    message:
      code === "23505"
        ? "Data sudah ada. Nama kategori atau anggaran bulan ini harus unik."
        : code === "23503"
          ? "Data masih digunakan, tipe kategori berbeda, atau relasi tidak tersedia. Periksa pilihan Anda."
          : code === "23514"
            ? "Pilihan tidak aktif atau nilai tidak valid. Muat ulang dan periksa formulir."
            : "Data belum tersimpan. Periksa koneksi dan coba kembali.",
  };
}
export async function saveRecord(
  entity: Entity,
  form: FormData,
): Promise<ActionResult> {
  if (!Object.hasOwn(entities, entity))
    return { ok: false, message: "Operasi tidak valid." };
  const config = entities[entity];
  const parsed = config.schema.safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return {
      ok: false,
      message: "Periksa isian yang ditandai.",
      errors: validationErrors(parsed.error),
    };
  const id = form.get("id");
  if (id && !idSchema.safeParse(id).success)
    return { ok: false, message: "ID tidak valid." };
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user)
    return {
      ok: false,
      message: "Sesi berakhir. Silakan masuk kembali.",
      redirectTo: "/login",
    };
  let current: Record<string, unknown> | null = null;
  if (id) {
    const result = await client
      .from(config.table)
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();
    if (result.error || !result.data)
      return { ok: false, message: "Data tidak ditemukan atau akses ditolak." };
    current = result.data;
  }
  const data: Record<string, unknown> = parsed.data;
  // Repeat relation ownership checks server-side; composite DB foreign keys are the final boundary.
  const relations = [
    ["project_id", "projects"],
    ["account_id", "financial_accounts"],
    ["from_account_id", "financial_accounts"],
    ["to_account_id", "financial_accounts"],
    ["category_id", "financial_categories"],
  ];
  for (const [key, table] of relations) {
    if (!data[key]) continue;
    const { data: relation, error } = await client
      .from(table)
      .select("*")
      .eq("id", data[key])
      .eq("user_id", user.id)
      .single();
    if (
      error ||
      !relation ||
      (relation.is_archived && current?.[key] !== data[key])
    )
      return {
        ok: false,
        message: "Pilihan tidak tersedia atau sudah diarsipkan.",
        errors: { [key]: ["Pilih data aktif milik Anda."] },
      };
    if (
      key === "category_id" &&
      relation.type !== (entity === "budget" ? "expense" : data.type)
    )
      return {
        ok: false,
        message: "Tipe kategori tidak sesuai.",
        errors: { category_id: ["Pilih kategori dengan jenis yang sesuai."] },
      };
  }
  const result = id
    ? await client
        .from(config.table)
        .update(data)
        .eq("id", id)
        .eq("user_id", user.id)
        .select("id")
        .single()
    : await client
        .from(config.table)
        .insert({ ...data, user_id: user.id })
        .select("id")
        .single();
  if (result.error) return databaseError(result.error.code);
  refresh(entity);
  if (entity === "transaction" && data.type === "expense") {
    const { data: budget } = await client
      .from("budget_usage")
      .select("spent,limit_amount")
      .eq("user_id", user.id)
      .eq("category_id", data.category_id)
      .eq("month", String(data.transaction_date).slice(0, 7) + "-01")
      .maybeSingle();
    if (
      budget &&
      BigInt(budget.spent) * BigInt(100) >=
        BigInt(budget.limit_amount) * BigInt(80)
    )
      return {
        ok: true,
        message: "Transaksi berhasil disimpan.",
        warning:
          BigInt(budget.spent) >= BigInt(budget.limit_amount)
            ? "Anggaran kategori ini sudah mencapai atau melampaui limit."
            : "Pengeluaran kategori ini sudah mencapai 80% anggaran.",
      };
  }
  return { ok: true, message: "Berhasil disimpan." };
}

export async function changeRecord(
  entity: Entity,
  id: string,
  operation: "delete" | "archive" | "restore" | "complete" | "reopen",
): Promise<ActionResult> {
  if (!Object.hasOwn(entities, entity) || !idSchema.safeParse(id).success)
    return { ok: false, message: "Operasi tidak valid." };
  const allowed =
    entity === "task"
      ? ["delete", "complete", "reopen"]
      : ["transaction", "budget"].includes(entity)
        ? ["delete"]
        : entity === "project"
          ? ["delete", "archive", "restore"]
          : ["archive", "restore"];
  if (!allowed.includes(operation))
    return { ok: false, message: "Operasi tidak diizinkan." };
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user)
    return {
      ok: false,
      message: "Sesi berakhir. Silakan masuk kembali.",
      redirectTo: "/login",
    };
  const table = entities[entity].table;
  const { data: current, error } = await client
    .from(table)
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  if (error || !current)
    return { ok: false, message: "Data tidak ditemukan atau akses ditolak." };
  const result =
    entity === "project" && operation === "delete"
      ? await client.rpc("delete_project", { p_id: id })
      : operation === "delete"
        ? await client.from(table).delete().eq("id", id).eq("user_id", user.id)
        : await client
            .from(table)
            .update(
              operation === "archive" || operation === "restore"
                ? { is_archived: operation === "archive" }
                : { status: operation === "complete" ? "done" : "todo" },
            )
            .eq("id", id)
            .eq("user_id", user.id);
  if (result.error) return databaseError(result.error.code);
  refresh(entity);
  return {
    ok: true,
    message: operation === "delete" ? "Data dihapus." : "Perubahan disimpan.",
  };
}
