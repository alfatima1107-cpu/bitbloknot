// Тема 9. Кодирование звука: I = частота × разрядность × время × число каналов.
import { fmt, round } from "../fmt.js";

export function generate(level, rng) {
  if (level === 1) {
    const fKhz = rng.choice([8, 16, 32]), bits = 8, t = rng.choice([1, 2, 3, 5, 10]);
    const v = Math.floor(fKhz * 1000 * bits * t / 8);
    return {
      text: `Звук записан в режиме <b>моно</b> с частотой дискретизации <b>${fKhz} кГц</b> ` +
            `и разрядностью <b>${bits} бит</b>. Длительность — <b>${t} с</b>. Каков объём файла в <b>байтах</b>?`,
      answer: v, unit: "байт",
      hint: "Объём = частота (замеров в секунду) × разрядность × время × каналы. 1 кГц = 1000 Гц.",
      solution: [`${fKhz} кГц = ${fmt(fKhz * 1000)} замеров в секунду`,
                 `I = ${fmt(fKhz * 1000)} × ${bits} × ${t} × 1 = ${fmt(v * 8)} бит`,
                 `${fmt(v * 8)} бит : 8 = ${fmt(v)} байт`],
      traps: { [v * 8]: "bits_bytes", [Math.floor(fKhz * bits * t / 8)]: "khz", [fKhz * bits * t]: "khz" },
    };
  }
  if (level === 2) {
    const fKhz = rng.choice([8, 16, 32, 48]), bits = rng.choice([8, 16]), t = rng.choice([2, 4, 5, 10]), ch = 2;
    const v = Math.floor(fKhz * 1000 * bits * t * ch / 8);
    return {
      text: `Производится <b>стерео</b>запись с частотой <b>${fKhz} кГц</b>, разрядность <b>${bits} бит</b>, ` +
            `длительность <b>${t} с</b>. Каков объём файла в <b>байтах</b>?`,
      answer: v, unit: "байт",
      hint: "В стерео два канала — объём в 2 раза больше, чем в моно.",
      solution: [`${fKhz} кГц = ${fmt(fKhz * 1000)} Гц, стерео = 2 канала`,
                 `I = ${fmt(fKhz * 1000)} × ${bits} × ${t} × 2 = ${fmt(v * 8)} бит`,
                 `${fmt(v * 8)} бит : 8 = ${fmt(v)} байт`],
      traps: { [Math.floor(v / 2)]: "stereo", [v * 8]: "bits_bytes", [Math.floor(v * 8 / 1000)]: "khz" },
    };
  }
  // level 3
  if (rng.random() < 0.5) {
    const fKhz = rng.choice([22.05, 44.1, 48]), bits = 16;
    const minutes = rng.choice([1, 2, 3, 5]), ch = rng.choice([1, 2]);
    const f = Math.round(fKhz * 1000);
    const b = f * bits * minutes * 60 * ch / 8;
    const mb = b / 1024 / 1024;
    const mode = ch === 2 ? "стерео" : "моно";
    const traps = { [mb * 8]: "bits_bytes", [mb / 60]: "minutes", [b / 1000 / 1000]: "kilo_1000" };
    if (ch === 2) traps[mb / 2] = "stereo";
    return {
      text: `Песня длится <b>${minutes} мин</b> и записана в режиме <b>${mode}</b>, ` +
            `частота <b>${fmt(fKhz)} кГц</b>, разрядность <b>${bits} бит</b>. ` +
            `Сколько <b>Мбайт</b> займёт файл? Округли до целых.`,
      answer: Math.round(mb), exact: mb, tolerance: 0.51, unit: "Мбайт",
      hint: "Переведи минуты в секунды, перемножь всё и переводи: бит → байт → Кбайт → Мбайт.",
      solution: [`${minutes} мин = ${minutes * 60} с; ${fmt(fKhz)} кГц = ${fmt(f)} Гц; каналов: ${ch}`,
                 `I = ${fmt(f)} × ${bits} × ${minutes * 60} × ${ch} = ${fmt(Math.round(b * 8))} бит`,
                 `= ${fmt(Math.round(b))} байт = ${fmt(round(b / 1024, 1))} Кбайт ≈ ${fmt(round(mb, 2))} Мбайт`,
                 `Ответ: ≈ ${Math.round(mb)} Мбайт`],
      traps,
    };
  }
  const fKhz = rng.choice([8, 16, 32]), bits = rng.choice([8, 16]), t = rng.choice([5, 10, 20, 30]);
  const v = Math.floor(fKhz * 1000 * bits * t / 8);
  return {
    text: `Звуковой файл <b>моно</b> с частотой <b>${fKhz} кГц</b> и разрядностью <b>${bits} бит</b> ` +
          `занимает <b>${fmt(v)} байт</b>. Сколько <b>секунд</b> длится запись?`,
    answer: t, unit: "с",
    hint: "Время = объём в битах : (частота × разрядность × каналы).",
    solution: [`${fmt(v)} байт × 8 = ${fmt(v * 8)} бит`,
               `t = ${fmt(v * 8)} : (${fmt(fKhz * 1000)} × ${bits}) = ${t} с`],
    traps: { [t / 8]: "bits_bytes", [t * 1000]: "khz" },
  };
}
