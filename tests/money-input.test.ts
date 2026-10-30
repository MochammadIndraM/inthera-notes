import { describe, expect, it } from "vitest";
import { formatMoneyInput, isMoneyPaste } from "@/lib/money-input";

describe("Format nominal saat mengetik", () => {
  it.each([
    ["", ""],
    ["0", "0"],
    ["0000", "0"],
    ["001000", "1.000"],
    ["200000", "200.000"],
    ["1234567", "1.234.567"],
    ["1.234.567", "1.234.567"],
    ["9007199254740993", "9.007.199.254.740.993"],
    ["9223372036854775807", "9.223.372.036.854.775.807"],
  ])("%s menjadi %s tanpa pembulatan", (raw, expected) => {
    expect(formatMoneyInput(raw)?.value).toBe(expected);
  });
  it.each(["sadsads", "12abc", "1e3", "1,5", "-200000", "1/2"])(
    "menolak %s tanpa mengubah nilai",
    (raw) => {
      expect(formatMoneyInput(raw)).toBeNull();
    },
  );
  it("mempertahankan posisi kursor ketika mengedit di tengah nominal", () => {
    expect(formatMoneyInput("1.2934", false, 4)).toEqual({
      value: "12.934",
      caret: 4,
    });
    expect(formatMoneyInput(".234", false, 0)).toEqual({
      value: "234",
      caret: 0,
    });
    expect(formatMoneyInput("1.34", false, 2)).toEqual({
      value: "134",
      caret: 1,
    });
  });
  it("saldo awal lama mendukung koreksi bertanda tanpa mempengaruhi nominal transaksi", () => {
    expect(formatMoneyInput("-25000", true)?.value).toBe("-25.000");
    expect(formatMoneyInput("-", true)?.value).toBe("-");
    expect(formatMoneyInput("-25000")).toBeNull();
  });
});

describe("Tempel nominal rupiah bulat", () => {
  it.each(["200000", "200.000", "Rp 200.000", "  Rp 1.250.000  ", "0"])(
    "menerima %s",
    (raw) => {
      expect(isMoneyPaste(raw)).toBe(true);
      expect(formatMoneyInput(raw)).not.toBeNull();
    },
  );
  it.each([
    "sadsads",
    "1e3",
    "1,5",
    "1.5",
    "12.34",
    "1.000,50",
    "-200000",
    "1 000",
  ])("menolak %s agar nominal tidak berubah arti", (raw) => {
    expect(isMoneyPaste(raw)).toBe(false);
  });
});
