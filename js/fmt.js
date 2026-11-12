// Красивая запись чисел и склонение слов.

/** 24576 → «24 576», 2.5 → «2,5». */
export function fmt(x) {
  x = Number(x);
  if (Number.isInteger(x)) return groupDigits(String(x));
  let s = x.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
  const [whole, frac] = s.split(".");
  return groupDigits(whole) + (frac ? "," + frac : "");
}

function groupDigits(s) {
  const neg = s.startsWith("-");
  if (neg) s = s.slice(1);
  return (neg ? "-" : "") + s.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

/** plural(3, "раз", "раза", "раз") → "раза". */
export function plural(n, one, few, many) {
  n = Math.abs(n) % 100;
  if (n >= 11 && n <= 14) return many;
  n %= 10;
  return n === 1 ? one : (n >= 2 && n <= 4) ? few : many;
}

/** round(3.14159, 2) → 3.14. */
export function round(x, digits = 0) {
  const m = 10 ** digits;
  return Math.round(x * m) / m;
}
