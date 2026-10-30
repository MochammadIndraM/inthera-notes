import { z } from "zod";
import { parseRupiah, validDate } from "./domain";

const name = z
  .string()
  .trim()
  .min(1, "Wajib diisi.")
  .max(80, "Maksimal 80 karakter.");
const title = z
  .string()
  .trim()
  .min(1, "Judul wajib diisi.")
  .max(160, "Maksimal 160 karakter.");
const text = z
  .string()
  .trim()
  .max(5000, "Maksimal 5.000 karakter.")
  .default("");
const uuid = z.uuid("Pilihan tidak valid.");
const optionalId = z.union([uuid, z.literal("")]).transform((v) => v || null);
const date = z.string().refine(validDate, "Tanggal tidak valid (1900–9999).");
const optionalDate = z.union([date, z.literal("")]).transform((v) => v || null);
function amount(signed = false) {
  return z
    .string()
    .refine(
      (v) => {
        try {
          parseRupiah(v, signed);
          return true;
        } catch {
          return false;
        }
      },
      signed
        ? "Gunakan rupiah bulat dalam batas BIGINT. Saldo awal akun baru minimal 0."
        : "Nominal wajib positif, bulat, dan dalam batas BIGINT. Contoh: 25.000.",
    )
    .transform((v) => parseRupiah(v, signed).toString());
}
export const taskSchema = z.object({
  title,
  description: text,
  priority: z.enum(["low", "medium", "high"]),
  status: z.enum(["todo", "in_progress", "done"]),
  due_date: optionalDate,
  project_id: optionalId,
});
export const accountSchema = z.object({
  name,
  type: z.enum(["cash", "bank", "ewallet", "other"]),
  opening_balance: amount(true),
  opened_on: optionalDate,
});
export const categorySchema = z.object({
  name,
  type: z.enum(["income", "expense"]),
});
export const projectSchema = z.object({
  name,
  description: text,
  color: z.string().regex(/^#[\da-fA-F]{6}$/, "Warna tidak valid."),
});
export const budgetSchema = z.object({
  category_id: uuid,
  month: date.refine((v) => v.endsWith("-01"), "Pilih awal bulan."),
  limit_amount: amount(),
});
export const transactionSchema = z
  .object({
    type: z.enum(["income", "expense", "transfer"]),
    amount: amount(),
    transaction_date: date,
    account_id: optionalId,
    from_account_id: optionalId,
    to_account_id: optionalId,
    category_id: optionalId,
    title: z.string().trim().max(160),
    notes: text,
  })
  .superRefine((v, ctx) => {
    const error = (path: string, message: string) =>
      ctx.addIssue({ code: "custom", path: [path], message });
    if (v.type === "transfer") {
      if (
        !v.from_account_id ||
        !v.to_account_id ||
        v.from_account_id === v.to_account_id
      )
        error("to_account_id", "Pilih dua akun yang berbeda.");
      if (v.account_id || v.category_id)
        error(
          "category_id",
          "Transfer tidak menggunakan kategori atau akun tunggal.",
        );
    } else {
      if (!v.account_id) error("account_id", "Pilih akun.");
      if (!v.category_id) error("category_id", "Pilih kategori.");
      if (v.from_account_id || v.to_account_id)
        error("account_id", "Akun transfer harus kosong.");
    }
  });
export const profileSchema = z.object({
  display_name: z.string().trim().max(80),
  theme: z.enum(["system", "light", "dark"]),
});
export const authSchema = z.object({
  email: z.email("Email tidak valid.").max(254),
  password: z.string().min(8, "Password minimal 8 karakter.").max(128),
});
export const registrationSchema = authSchema
  .extend({
    display_name: z.string().trim().max(80),
    confirm_password: z.string(),
  })
  .refine((v) => v.password === v.confirm_password, {
    path: ["confirm_password"],
    message: "Konfirmasi password tidak sama.",
  });
export const idSchema = uuid;
export function validationErrors(error: {
  issues: { path: PropertyKey[]; message: string }[];
}) {
  const fields: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    (fields[key] ??= []).push(issue.message);
  }
  return fields;
}
