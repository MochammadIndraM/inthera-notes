const MAX_MONEY = BigInt("9223372036854775807");
export function parseRupiah(input: string, signed = false): bigint {
  const clean = input
    .trim()
    .replace(/^Rp\s*/i, "")
    .trim();
  const pattern = signed
    ? /^-?(?:\d+|\d{1,3}(?:\.\d{3})+)$/
    : /^(?:\d+|\d{1,3}(?:\.\d{3})+)$/;
  if (!pattern.test(clean) || clean.length > 32)
    throw new Error("Masukkan rupiah bulat, contoh 25000 atau Rp 25.000.");
  const value = BigInt(clean.replaceAll(".", ""));
  if (
    (!signed && value <= BigInt(0)) ||
    value > MAX_MONEY ||
    value < -MAX_MONEY
  )
    throw new Error("Nominal harus positif dan dalam batas BIGINT.");
  return value;
}
export function money(value: string | bigint) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(BigInt(value));
}
export function todayWib(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  return ["year", "month", "day"]
    .map((type) => parts.find((p) => p.type === type)!.value)
    .join("-");
}
export function validDate(value: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    value >= "1900-01-01" &&
    value <= "9999-12-31" &&
    !Number.isNaN(Date.parse(value)) &&
    new Date(value + "T00:00:00Z").toISOString().slice(0, 10) === value
  );
}
export function nextDay(date: string) {
  const value = new Date(date + "T00:00:00Z");
  value.setUTCDate(value.getUTCDate() + 1);
  return value.toISOString().slice(0, 10);
}
export function monthRange(month: string) {
  if (
    !/^\d{4}-(0[1-9]|1[0-2])$/.test(month) ||
    !validDate(month + "-01") ||
    month >= "9999-12"
  )
    throw new Error("Bulan tidak valid.");
  const start = month + "-01";
  const end = new Date(start + "T00:00:00Z");
  end.setUTCMonth(end.getUTCMonth() + 1);
  return { start, end: end.toISOString().slice(0, 10) };
}
export function dateLabel(value: string | null, full = false) {
  if (!value) return "Tanpa tenggat";
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: full ? "long" : "short",
    ...(full ? { year: "numeric" } : {}),
  }).format(new Date(value + "T05:00:00Z"));
}
export function taskGroup(
  task: { status: string; due_date: string | null },
  today: string,
) {
  if (task.status === "done") return "Selesai";
  if (!task.due_date) return "Tanpa tenggat";
  if (task.due_date < today) return "Perlu perhatian";
  return task.due_date === today ? "Hari ini" : "Mendatang";
}
export function completion(
  status: string,
  previous: string | null,
  now = new Date(),
) {
  return status === "done" ? (previous ?? now.toISOString()) : null;
}
export function percent(value: string | bigint, limit: string | bigint) {
  const denominator = BigInt(limit);
  return denominator > BigInt(0)
    ? Number((BigInt(value) * BigInt(10000)) / denominator) / 100
    : 0;
}
export function csvCell(value: string) {
  const safe =
    /^[\s]*[=+\-@\t\r]/.test(value) || /^[\t\r]/.test(value)
      ? "'" + value
      : value;
  return '"' + safe.replaceAll('"', '""') + '"';
}
export function safeNext(value: unknown) {
  return typeof value === "string" &&
    /^\/(?:dashboard|tasks|finance|settings)(?:[/?][^\\\r\n]*)?$/.test(value)
    ? value
    : "/dashboard";
}
