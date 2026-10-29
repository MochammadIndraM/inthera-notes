import { describe, expect, it } from "vitest";
import {
  completion,
  csvCell,
  dateLabel,
  money,
  monthRange,
  nextDay,
  parseRupiah,
  percent,
  safeNext,
  taskGroup,
  todayWib,
  validDate,
} from "@/lib/domain";
import { taskSchema, transactionSchema } from "@/lib/validation";

describe("Rupiah integer tanpa kehilangan presisi", () => {
  it.each([
    ["Rp 25.000", "25000"],
    ["25000", "25000"],
    ["9.223.372.036.854.775.807", "9223372036854775807"],
    ["9.007.199.254.740.993", "9007199254740993"],
  ])("parse %s", (input, expected) =>
    expect(parseRupiah(input).toString()).toBe(expected),
  );
  it.each([
    "",
    "0",
    "-1",
    "1,5",
    "1.5",
    "12.50",
    "25.000,00",
    "1e5",
    "NaN",
    "9223372036854775808",
    "25.000abc",
  ])("menolak nominal %s", (input) =>
    expect(() => parseRupiah(input)).toThrow(),
  );
  it("saldo awal dapat negatif dan nol", () => {
    expect(parseRupiah("-25.000", true)).toBe(BigInt(-25000));
    expect(parseRupiah("0", true)).toBe(BigInt(0));
  });
  it("formatter tidak mengubah integer besar", () =>
    expect(money("9007199254740993").replaceAll(/\s/g, "")).toBe(
      "Rp9.007.199.254.740.993",
    ));
  it("persentase anggaran melewati 100%", () =>
    expect(percent("125000", "100000")).toBe(125));
});
describe("Tanggal kalender dan WIB", () => {
  it("WIB sudah berganti hari saat host masih UTC", () =>
    expect(todayWib(new Date("2026-10-31T17:00:00Z"))).toBe("2026-11-01"));
  it("sebelum batas tengah malam WIB", () =>
    expect(todayWib(new Date("2026-10-31T16:59:59Z"))).toBe("2026-10-31"));
  it("batas bulan, tahun, leap day", () => {
    expect(monthRange("2026-12")).toEqual({
      start: "2026-12-01",
      end: "2027-01-01",
    });
    expect(nextDay("2024-02-28")).toBe("2024-02-29");
    expect(nextDay("2026-02-28")).toBe("2026-03-01");
  });
  it.each([
    "2026-02-29",
    "2026-13-01",
    "2026-04-31",
    "not-a-date",
    "2026-1-01",
  ])("menolak DATE %s", (date) => expect(validDate(date)).toBe(false));
  it("label DATE tidak menggeser tanggal", () =>
    expect(dateLabel("2026-10-29", true)).toBe("29 Oktober 2026"));
  it("overdue, undated, done dipisah", () => {
    expect(
      taskGroup({ status: "todo", due_date: "2026-10-28" }, "2026-10-29"),
    ).toBe("Perlu perhatian");
    expect(taskGroup({ status: "todo", due_date: null }, "2026-10-29")).toBe(
      "Tanpa tenggat",
    );
    expect(
      taskGroup({ status: "done", due_date: "2026-10-28" }, "2026-10-29"),
    ).toBe("Selesai");
  });
});
describe("Validasi dan keamanan ekspor", () => {
  it.each([
    "=SUM(1,2)",
    "+cmd",
    "-danger",
    "@import",
    "\tfield",
    "\rfield",
    "  =formula",
  ])("sanitasi CSV %s", (value) =>
    expect(csvCell(value).startsWith("\"'")).toBe(true),
  );
  it("CSV mengutip koma, newline, dan double quote", () =>
    expect(csvCell('Makan, "siang"\nlagi')).toBe('"Makan, ""siang""\nlagi"'));
  it.each([
    "https://evil.test",
    "//evil.test",
    "/\\evil.test",
    "/dashboard\r\nLocation:bad",
    "/login",
    "/dashboardevil",
  ])("mencegah redirect %s", (value) =>
    expect(safeNext(value)).toBe("/dashboard"),
  );
  it("redirect internal yang valid", () =>
    expect(safeNext("/finance/transactions?type=expense")).toBe(
      "/finance/transactions?type=expense",
    ));
  it("task trim dan judul kosong", () => {
    const task = {
      title: "  Rencana  ",
      description: "",
      priority: "medium",
      status: "todo",
      due_date: "",
      project_id: "",
    };
    expect(taskSchema.parse(task).title).toBe("Rencana");
    expect(taskSchema.safeParse({ ...task, title: "  " }).success).toBe(false);
  });
  it("todo → done → todo", () => {
    const now = new Date("2026-10-29T17:30:00Z");
    const done = completion("done", null, now);
    expect(done).toBe(now.toISOString());
    expect(completion("done", done)).toBe(done);
    expect(completion("todo", done)).toBeNull();
  });
  it("transfer menolak akun sama, kategori, nominal nol", () => {
    const account = "10000000-0000-4000-8000-000000000001";
    const transaction = {
      type: "transfer",
      amount: "100",
      transaction_date: "2026-10-29",
      from_account_id: account,
      to_account_id: account,
      account_id: "",
      category_id: "",
      title: "",
      notes: "",
    };
    expect(transactionSchema.safeParse(transaction).success).toBe(false);
    expect(
      transactionSchema.safeParse({ ...transaction, amount: "0" }).success,
    ).toBe(false);
  });
});
