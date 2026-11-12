// Генераторы задач.
//
// Каждый генератор — функция generate(level, rng) → объект «задача»:
//   text      — условие (может содержать простую разметку HTML)
//   kind      — "number" (ответ числом), "text" (ответ строкой) или "choice" (выбор варианта)
//   answer    — правильный ответ
//   options   — варианты (только для "choice")
//   unit      — подпись после поля ввода («бит», «Кбайт» …)
//   tolerance — допустимая погрешность (для задач «округли до целых»)
//   hint      — общая подсказка, если ошибка не распознана
//   solution  — пошаговое решение (список строк)
//   traps     — ответы-ловушки: {ответ: тип ошибки}, см. js/errors.js
import { Rng } from "../rng.js";
import * as alphabet from "./alphabet.js";
import * as files from "./files.js";
import * as image from "./image.js";
import * as sound from "./sound.js";
import * as text from "./text.js";
import * as units from "./units.js";

export const REGISTRY = {
  alphabet: alphabet.generate,
  files: files.generate,
  image: image.generate,
  sound: sound.generate,
  text: text.generate,
  units: units.generate,
};

export function make(key, level, rng = new Rng()) {
  const task = REGISTRY[key](Math.max(1, Math.min(3, level)), rng);
  task.kind ??= "number";
  task.unit ??= "";
  task.traps ??= {};
  task.tolerance ??= 0;
  task.level = level;
  task.generator = key;
  // ловушки: одинаковые числа записываем одинаково, ловушка не может совпадать с ответом
  const clean = {};
  for (let [k, v] of Object.entries(task.traps)) {
    k = task.kind === "number" ? canon(k) : String(k);
    if (k === null || k in clean || same(k, task.answer, task.tolerance)
        || same(k, task.exact ?? task.answer, task.tolerance)) continue;
    clean[k] = v;
  }
  task.traps = clean;
  return task;
}

function canon(x) {
  const f = Number(x);
  if (x === "" || x === null || !Number.isFinite(f) || f <= 0) return null;
  return Number.isInteger(f) ? String(f) : String(Math.round(f * 1e6) / 1e6);
}

function same(a, b, tol = 0) {
  const fa = Number(a), fb = Number(b);
  if (Number.isFinite(fa) && Number.isFinite(fb) && String(a).trim() !== "" && String(b).trim() !== "") {
    return Math.abs(fa - fb) <= Math.max(tol, 1e-9);
  }
  return String(a).toLowerCase() === String(b).toLowerCase();
}

export { fmt } from "../fmt.js";
