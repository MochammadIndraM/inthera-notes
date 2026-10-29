import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { period, stringParam } from "@/lib/queries";
import { z } from "zod";
import { csvCell } from "@/lib/domain";
import type { Transaction } from "@/lib/types";

export async function GET(request: NextRequest) {
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user)
    return NextResponse.json(
      { error: "Silakan masuk kembali." },
      { status: 401 },
    );
  const params = Object.fromEntries(request.nextUrl.searchParams);
  const rows: string[] = [
    "\uFEFFTanggal,Jenis,Kategori,Akun Asal,Akun Tujuan,Nominal (IDR),Catatan",
  ];
  const range = period(params);
  const type = stringParam(params, "type");
  const uuid = (key: string) =>
    z.uuid().safeParse(params[key]).success ? params[key] : null;
  const { data, error } = await client.rpc("export_transactions", {
    p_start: range.start,
    p_end: range.end,
    p_type: ["income", "expense", "transfer"].includes(type) ? type : null,
    p_account: uuid("account"),
    p_category: uuid("category"),
    p_search: stringParam(params, "q")
      .trim()
      .slice(0, 160)
      .replace(/[\\%_]/g, "\\$&"),
    p_sort: stringParam(params, "sort"),
  });
  if (error || !data)
    return NextResponse.json(
      { error: "Ekspor gagal. Coba kembali." },
      { status: 503 },
    );
  for (const t of data.rows as Transaction[])
    rows.push(
      [
        csvCell(t.transaction_date),
        csvCell(
          { income: "Pemasukan", expense: "Pengeluaran", transfer: "Transfer" }[
            t.type
          ],
        ),
        csvCell(t.category_name ?? ""),
        csvCell(
          t.type === "income"
            ? ""
            : (t.from_account_name ?? t.account_name ?? ""),
        ),
        csvCell(
          t.type === "income"
            ? (t.account_name ?? "")
            : (t.to_account_name ?? ""),
        ),
        t.amount,
        csvCell([t.title, t.notes].filter(Boolean).join(" — ")),
      ].join(","),
    );
  return new NextResponse(rows.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition":
        'attachment; filename="intheranotes-transaksi.csv"',
      "Cache-Control": "private, no-store",
    },
  });
}
