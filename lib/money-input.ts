function withoutCurrency(raw: string) {
  return raw.trim().replace(/^Rp\s*/i, "");
}

/** Accept whole-rupiah clipboard values; never turn decimals/exponents into other amounts. */
export function isMoneyPaste(raw: string, signed = false) {
  const value = withoutCurrency(raw);
  return (
    value.length <= 32 &&
    (signed
      ? /^-?(?:\d+|\d{1,3}(?:\.\d{3})+)$/.test(value)
      : /^(?:\d+|\d{1,3}(?:\.\d{3})+)$/.test(value))
  );
}

/** Format strings directly so values above Number.MAX_SAFE_INTEGER stay exact. */
export function formatMoneyInput(
  raw: string,
  signed = false,
  cursor = raw.length,
) {
  const value = withoutCurrency(raw);
  if (!(signed ? /^-?[\d.]*$/ : /^[\d.]*$/).test(value)) return null;
  const negative = signed && value.startsWith("-");
  const rawDigits = value.replace(/\D/g, "");
  const leadingZeros = rawDigits.match(/^0+(?=\d)/)?.[0].length ?? 0;
  const digits = rawDigits.slice(leadingZeros);
  const formatted =
    (negative ? "-" : "") + digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  let remaining = Math.max(
    0,
    raw.slice(0, cursor).replace(/\D/g, "").length - leadingZeros,
  );
  let caret = negative && cursor > 0 ? 1 : 0;
  for (let index = 0; index < formatted.length && remaining > 0; index++) {
    if (/\d/.test(formatted[index])) remaining--;
    caret = index + 1;
  }
  return { value: formatted, caret };
}
