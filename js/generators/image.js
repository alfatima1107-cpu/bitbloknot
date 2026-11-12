// Тема 8. Кодирование изображений: N = 2ⁱ (палитра и глубина цвета), I = ширина × высота × i.
import { fmt } from "../fmt.js";

export function depth(nColors) {
  return Math.max(1, Math.ceil(Math.log2(nColors)));
}

export function generate(level, rng) {
  const kind = rng.choice({
    1: ["depth", "volume_small"],
    2: ["depth_odd", "volume_bytes"],
    3: ["volume_kb", "colors_from_volume", "palette_change"],
  }[level]);

  if (kind === "depth") {
    const i = rng.choice([1, 2, 3, 4, 5, 6, 8]), n = 2 ** i;
    return {
      text: `В палитре <b>${n}</b> цветов. Какова глубина цвета (сколько бит на один пиксель)?`,
      answer: i, unit: "бит",
      hint: "Глубина цвета i связана с числом цветов N формулой N = 2ⁱ.",
      solution: [`N = ${n} = 2^${i}`, `Глубина цвета i = ${i} бит`],
      traps: { [Math.floor(n / 2)]: "n_vs_i", [n]: "n_vs_i" },
    };
  }
  if (kind === "volume_small") {
    const w = rng.choice([4, 5, 8, 10, 16]), h = rng.choice([4, 5, 8, 10, 16]);
    const n = rng.choice([2, 4]), i = depth(n), v = w * h * i;
    return {
      text: `Рисунок размером <b>${w} × ${h}</b> пикселей использует палитру из <b>${n}</b> цветов. ` +
            `Каков объём рисунка в <b>битах</b>?`,
      answer: v, unit: "бит",
      hint: "Объём = количество пикселей × глубина цвета. Сначала найди глубину цвета из N = 2ⁱ.",
      solution: [`Пикселей: ${w} × ${h} = ${w * h}`, `${n} цвета → i = ${i} бит`, `I = ${w * h} × ${i} = ${v} бит`],
      traps: { [w * h]: "n_vs_i", [w * h * n]: "n_vs_i", [(w + h) * i]: "pixels" },
    };
  }
  if (kind === "depth_odd") {
    const n = rng.choice([3, 5, 6, 7, 10, 12, 20, 25, 50, 100, 200]), i = depth(n);
    return {
      text: `Художник использует палитру из <b>${n}</b> цветов. Сколько бит нужно на один пиксель?`,
      answer: i, unit: "бит",
      hint: "Подбери наименьшую степень двойки, которой хватит на все цвета.",
      solution: [`2^${i - 1} = ${2 ** (i - 1)} < ${n} — не хватает`, `2^${i} = ${2 ** i} ≥ ${n} — хватает`, `i = ${i} бит`],
      traps: { [i - 1]: "no_ceil" },
    };
  }
  if (kind === "volume_bytes") {
    const w = rng.choice([8, 16, 20, 32, 40]), h = rng.choice([8, 16, 20, 32, 40]);
    const n = rng.choice([4, 5, 16, 20, 256]), i = depth(n);
    const bits = w * h * i, v = Math.floor(bits / 8);
    return {
      text: `Изображение <b>${w} × ${h}</b> пикселей, палитра из <b>${n}</b> цветов. ` +
            `Каков объём изображения в <b>байтах</b>?`,
      answer: v, unit: "байт",
      hint: "Пиксели × глубина цвета дадут биты; переведи их в байты.",
      solution: [`Пикселей: ${w} × ${h} = ${w * h}`, `${n} цветов → i = ${i} бит`,
                 `I = ${w * h} × ${i} = ${fmt(bits)} бит`, `${fmt(bits)} бит : 8 = ${fmt(v)} байт`],
      traps: { [bits]: "bits_bytes", [w * h * (i - 1) / 8]: "no_ceil", [w * h * n / 8]: "n_vs_i" },
    };
  }
  if (kind === "volume_kb") {
    let w, h, n, i, bits;
    for (;;) {
      w = rng.choice([32, 64, 128, 256, 512]); h = rng.choice([32, 64, 128, 256]);
      n = rng.choice([2, 4, 16, 256, 65536]); i = depth(n);
      bits = w * h * i;
      if (bits % 8192 === 0 && bits / 8192 <= 1024) break;
    }
    const kb = bits / 8192;
    return {
      text: `Растровое изображение <b>${w} × ${h}</b> пикселей, палитра <b>${fmt(n)}</b> цветов. ` +
            `Сколько <b>Кбайт</b> займёт изображение?`,
      answer: kb, unit: "Кбайт",
      hint: "Пиксели × глубина цвета → биты → байты (: 8) → Кбайты (: 1024).",
      solution: [`Пикселей: ${w} × ${h} = ${fmt(w * h)}`, `${fmt(n)} цветов → i = ${i} бит`,
                 `I = ${fmt(w * h)} × ${i} = ${fmt(bits)} бит`,
                 `${fmt(bits)} : 8 = ${fmt(bits / 8)} байт`, `${fmt(bits / 8)} : 1024 = ${kb} Кбайт`],
      traps: { [bits / 8]: "one_step", [kb * 8]: "bits_bytes", [bits / 8 / 1000]: "kilo_1000" },
    };
  }
  if (kind === "colors_from_volume") {
    let w, h, i, bits;
    for (;;) {
      w = rng.choice([32, 64, 128]); h = rng.choice([32, 64, 128]);
      i = rng.choice([1, 2, 4, 8]);
      bits = w * h * i;
      if (bits % 8192 === 0) break;
    }
    const kb = bits / 8192, n = 2 ** i;
    return {
      text: `Рисунок <b>${w} × ${h}</b> пикселей занимает <b>${kb} Кбайт</b> памяти. ` +
            `Какое максимальное число цветов может быть в палитре?`,
      answer: n, unit: "цветов",
      hint: "Переведи объём в биты, раздели на число пикселей — получишь i. Потом N = 2ⁱ.",
      solution: [`${kb} Кбайт = ${kb} × 1024 × 8 = ${fmt(bits)} бит`,
                 `Пикселей: ${w} × ${h} = ${fmt(w * h)}`, `i = ${fmt(bits)} : ${fmt(w * h)} = ${i} бит`,
                 `N = 2^${i} = ${n} цветов`],
      traps: { [i]: "n_vs_i" },
    };
  }
  // palette_change
  const [i1, i2] = rng.choice([[8, 4], [8, 2], [16, 8], [4, 2], [8, 1], [16, 4], [24, 8]]);
  const n1 = 2 ** i1, n2 = 2 ** i2, ratio = Math.floor(i1 / i2);
  return {
    text: `Палитру изображения уменьшили с <b>${fmt(n1)}</b> до <b>${fmt(n2)}</b> цветов. ` +
          `Во сколько раз уменьшился объём изображения?`,
    answer: ratio, unit: "раз(а)",
    hint: "Объём зависит не от числа цветов, а от глубины цвета i. Сравни i до и после.",
    solution: [`${fmt(n1)} цветов → i = ${i1} бит`, `${fmt(n2)} цветов → i = ${i2} бит`,
               `${i1} : ${i2} = ${ratio} — во столько раз уменьшился объём`],
    traps: { [Math.floor(n1 / n2)]: "n_vs_i" },
  };
}
