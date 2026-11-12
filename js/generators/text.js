// Тема 7. Кодирование текста: объём = количество символов × вес символа.
import { fmt } from "../fmt.js";

const PHRASES = [
  "Бит за битом.", "Привет, мир!", "Я люблю информатику!", "Кот спит на клавиатуре.", "Код 7 класса",
  "Байт — это 8 бит.", "Ура, каникулы!", "Мой компьютер думает.", "Пиксель, байт, файл.", "Учи Python!",
];
const WORDS = ["бит", "байт", "файл", "код", "пиксель", "компьютер", "алгоритм", "процессор", "монитор", "клавиатура"];
const ENCODINGS = [[8, "КОИ-8 (8 бит на символ)"], [16, "Unicode (16 бит на символ)"]];

export function generate(level, rng) {
  if (level === 1) {
    const w = rng.choice(WORDS);
    const [bits, name] = rng.choice(ENCODINGS);
    const n = [...w].length, v = n * bits;
    return {
      text: `Слово «<b>${w}</b>» записано в кодировке ${name}. Каков его объём в <b>битах</b>?`,
      answer: v, unit: "бит",
      hint: "Посчитай буквы в слове и умножь на вес одной буквы.",
      solution: [`В слове «${w}» ${n} символов`, `${n} × ${bits} = ${v} бит`],
      traps: { [Math.floor(v / 8)]: "bits_bytes", [n]: "bits_bytes" },
    };
  }
  if (level === 2) {
    const p = rng.choice(PHRASES);
    const [bits, name] = rng.choice(ENCODINGS);
    const n = [...p].length;
    const noSpaces = [...p].filter(ch => /[\p{L}\p{N}]/u.test(ch)).length;
    const v = Math.floor(n * bits / 8);
    return {
      text: `Сколько <b>байт</b> займёт фраза «<b>${p}</b>» в кодировке ${name}? (Кавычки не считаем.)`,
      answer: v, unit: "байт",
      hint: "Считай все символы: буквы, цифры, пробелы и знаки препинания.",
      solution: [`Символов во фразе (с пробелами и знаками): ${n}`,
                 `${n} × ${bits} бит = ${n * bits} бит`, `${n * bits} бит : 8 = ${v} байт`],
      traps: { [n * bits]: "bits_bytes", [Math.floor(noSpaces * bits / 8)]: "spaces", [noSpaces * bits]: "spaces" },
    };
  }
  // level 3: страницы → Кбайты
  let pages, lines, chars, bits, name, totalBytes;
  for (;;) {
    pages = rng.choice([2, 4, 8, 16, 32]);
    lines = rng.choice([16, 32, 64]);
    chars = rng.choice([32, 64, 128]);
    [bits, name] = rng.choice(ENCODINGS);
    totalBytes = pages * lines * chars * bits / 8;
    if (totalBytes % 1024 === 0 && totalBytes / 1024 <= 512) break;
  }
  const kb = totalBytes / 1024;
  const n = pages * lines * chars;
  return {
    text: `Реферат набран на компьютере и содержит <b>${pages}</b> страниц, на каждой странице ` +
          `<b>${lines}</b> строк, в каждой строке <b>${chars}</b> символов. Текст в кодировке ${name}. ` +
          `Каков объём реферата в <b>Кбайтах</b>?`,
    answer: kb, unit: "Кбайт",
    hint: "Найди общее число символов (страницы × строки × символы), умножь на вес символа и переведи в Кбайты.",
    solution: [`Символов: ${pages} × ${lines} × ${chars} = ${fmt(n)}`,
               `Объём: ${fmt(n)} × ${bits} бит = ${fmt(n * bits)} бит`,
               `${fmt(n * bits)} бит : 8 = ${fmt(totalBytes)} байт`,
               `${fmt(totalBytes)} байт : 1024 = ${kb} Кбайт`],
    traps: {
      [totalBytes]: "one_step", [kb * 8]: "bits_bytes",
      [totalBytes / 1000]: "kilo_1000", [n * bits / 1024]: "bits_bytes",
    },
  };
}
