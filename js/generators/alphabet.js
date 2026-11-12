// Тема 5. Алфавит и двоичный код: N = 2ⁱ, объём сообщения I = K × i.
import { fmt } from "../fmt.js";

/** Сколько бит нужно, чтобы закодировать n вариантов (округление вверх). */
export function bitsFor(n) {
  return Math.max(1, Math.ceil(Math.log2(n)));
}

const isPow2 = n => (n & (n - 1)) === 0;
const gcd = (a, b) => (b ? gcd(b, a % b) : a);

export function generate(level, rng) {
  const kind = rng.choice({
    1: ["i_from_n", "n_from_i"],
    2: ["i_from_n_odd", "volume_bits"],
    3: ["volume_bytes_odd", "n_from_volume"],
  }[level]);

  if (kind === "i_from_n") {
    const i = rng.randint(1, 8), n = 2 ** i;
    return {
      text: `В алфавите <b>${n}</b> символов. Сколько бит нужно, чтобы закодировать один символ?`,
      answer: i, unit: "бит",
      hint: "Подбери степень двойки: 2 в какой степени равно мощности алфавита?",
      solution: [`N = ${n}`, `${n} = 2^${i}, значит, i = ${i} бит`],
      traps: { [Math.floor(n / 2)]: "n_vs_i", [n]: "n_vs_i" },
    };
  }
  if (kind === "n_from_i") {
    const i = rng.randint(2, 8), n = 2 ** i;
    return {
      text: `Каждый символ алфавита кодируется <b>${i}</b> битами. Сколько символов может быть в алфавите (максимум)?`,
      answer: n, unit: "символов",
      hint: "Сколько разных кодов можно составить из i нулей и единиц? Каждый бит удваивает число вариантов.",
      solution: [`N = 2^i = 2^${i} = ${n}`],
      traps: { [2 * i]: "n_vs_i", [i * i]: "n_vs_i" },
    };
  }
  if (kind === "i_from_n_odd") {
    let n;
    do { n = rng.randint(3, 200); } while (isPow2(n));
    const i = bitsFor(n);
    return {
      text: `В алфавите племени Мумба-Юмба <b>${n}</b> символов. Сколько бит нужно на один символ?`,
      answer: i, unit: "бит",
      hint: "Найди наименьшую степень двойки, которая не меньше числа символов.",
      solution: [`2^${i - 1} = ${2 ** (i - 1)} — мало, не хватит на ${n} символов`,
                 `2^${i} = ${2 ** i} — хватает`, `Значит, i = ${i} бит`],
      traps: { [i - 1]: "no_ceil" },
    };
  }
  if (kind === "volume_bits") {
    const i = rng.randint(1, 6), n = 2 ** i;
    const k = rng.choice([10, 12, 16, 20, 25, 30, 40, 50, 64, 100]);
    const v = k * i;
    const traps = { [k * n]: "n_vs_i" };
    if (v % 8 === 0) traps[v / 8] = "bits_bytes";
    return {
      text: `Сообщение записано буквами алфавита из <b>${n}</b> символов и содержит <b>${k}</b> символов. ` +
            `Каков информационный объём сообщения в битах?`,
      answer: v, unit: "бит",
      hint: "Сначала найди вес одного символа i из N = 2ⁱ, потом умножь на количество символов.",
      solution: [`N = ${n} = 2^${i}, значит, i = ${i} бит`, `I = K × i = ${k} × ${i} = ${v} бит`],
      traps,
    };
  }
  if (kind === "volume_bytes_odd") {
    let n;
    do { n = rng.randint(5, 120); } while (isPow2(n));
    const i = bitsFor(n);
    let k = rng.choice([8, 16, 24, 32, 40, 48, 64, 80, 96, 128, 200]);
    let bits = k * i;
    if (bits % 8) {
      k = k * 8 / gcd(8, k);   // подгоняем, чтобы делилось на 8
      bits = k * i;
    }
    const v = bits / 8;
    return {
      text: `Алфавит содержит <b>${n}</b> символов. Сколько <b>байт</b> займёт сообщение из <b>${k}</b> символов, ` +
            `если каждый символ кодируется минимально возможным одинаковым числом бит?`,
      answer: v, unit: "байт",
      hint: "Найди i (округляя вверх), умножь на количество символов и переведи биты в байты.",
      solution: [`N = ${n} → i = ${i} бит (2^${i} = ${2 ** i} ≥ ${n})`,
                 `I = ${k} × ${i} = ${bits} бит`, `${bits} бит : 8 = ${v} байт`],
      traps: { [bits]: "bits_bytes", [k * (i - 1) / 8]: "no_ceil", [k * (i - 1)]: "no_ceil" },
    };
  }
  // n_from_volume
  const i = rng.randint(2, 6);
  const k = rng.choice([8, 16, 24, 32, 48, 64, 80, 128]);
  const bits = k * i, v = bits / 8, n = 2 ** i;
  const traps = { [i]: "n_vs_i" };
  if (v % k === 0) traps[2 ** (v / k)] = "bits_bytes";
  return {
    text: `Сообщение из <b>${k}</b> символов имеет объём <b>${fmt(v)} байт</b>. ` +
          `Какова мощность алфавита (максимальное число символов)?`,
    answer: n, unit: "символов",
    hint: "Переведи объём в биты, найди, сколько бит приходится на один символ, а потом N = 2ⁱ.",
    solution: [`${v} байт × 8 = ${bits} бит`, `i = ${bits} : ${k} = ${i} бит на символ`, `N = 2^${i} = ${n}`],
    traps,
  };
}
