// Тема 6. Перевод единиц измерения информации.
// Лестница: бит —×8→ байт —×1024→ Кбайт —×1024→ Мбайт —×1024→ Гбайт.
import { fmt } from "../fmt.js";

export const UNITS = ["бит", "байт", "Кбайт", "Мбайт", "Гбайт"];
export const STEP = [null, 8, 1024, 1024, 1024];   // во сколько раз ступень больше предыдущей

export function bitsIn(unit, kilo = 1024) {
  const i = UNITS.indexOf(unit);
  return i === 0 ? 1 : 8 * kilo ** (i - 1);
}

export function convert(value, a, b, kilo = 1024) {
  return value * bitsIn(a, kilo) / bitsIn(b, kilo);
}

const PAIRS = {
  1: [["байт", "бит"], ["бит", "байт"]],
  2: [["Кбайт", "байт"], ["байт", "Кбайт"], ["Кбайт", "бит"], ["Мбайт", "Кбайт"]],
  3: [["бит", "Кбайт"], ["Мбайт", "бит"], ["Кбайт", "Мбайт"], ["Гбайт", "Мбайт"], ["Мбайт", "байт"]],
};

/** Пошаговый перевод по лестнице единиц. */
export function ladder(value, a, b) {
  const ia = UNITS.indexOf(a), ib = UNITS.indexOf(b);
  const steps = [];
  let v = value;
  if (ia > ib) {            // к более мелкой единице — умножаем
    for (let i = ia; i > ib; i--) {
      const nv = v * STEP[i];
      steps.push(`${fmt(v)} ${UNITS[i]} × ${STEP[i]} = ${fmt(nv)} ${UNITS[i - 1]}`);
      v = nv;
    }
  } else {                  // к более крупной — делим
    for (let i = ia + 1; i <= ib; i++) {
      const nv = v / STEP[i];
      steps.push(`${fmt(v)} ${UNITS[i - 1]} : ${STEP[i]} = ${fmt(nv)} ${UNITS[i]}`);
      v = nv;
    }
  }
  return steps;
}

export function generate(level, rng) {
  const [a, b] = rng.choice(PAIRS[level]);
  const ia = UNITS.indexOf(a), ib = UNITS.indexOf(b);
  let value, answer;
  if (ia > ib) {
    value = level < 3 ? rng.choice([2, 3, 4, 5, 6, 8, 10, 12, 16]) : rng.choice([2, 3, 4, 5]);
    answer = convert(value, a, b);
  } else {
    answer = rng.choice([2, 3, 4, 5, 6, 8, 10, 16]);
    value = convert(answer, b, a);
  }
  value = Math.trunc(value); answer = Math.trunc(answer);

  const traps = {};
  traps[convert(value, b, a)] = "wrong_direction";
  traps[convert(value, a, b, 1000)] = "kilo_1000";
  traps[answer * 8] = "bits_bytes";
  traps[answer / 8] = "bits_bytes";
  if (Math.abs(ia - ib) >= 2) {   // частичный перевод — только первая ступенька
    const first = ia > ib ? UNITS[ia - 1] : UNITS[ia + 1];
    traps[convert(value, a, first)] = "one_step";
    if (a === "бит" || b === "бит") {   // «забыл» ступеньку бит↔байт
      const other = b === "бит" ? "байт" : b;
      const src = a === "бит" ? "байт" : a;
      traps[convert(value, src, other)] = "bits_bytes";
    }
  }

  return {
    text: `Сколько будет <b>${fmt(value)} ${a}</b> в единицах «${b}»?`,
    answer,
    unit: b,
    hint: "Найди на лестнице единиц, в какую сторону идти: к крупным единицам — делим, " +
          "к мелким — умножаем. Между битом и байтом ступенька ×8, дальше ×1024.",
    solution: [...ladder(value, a, b), `Ответ: ${fmt(answer)} ${b}`],
    traps,
  };
}
