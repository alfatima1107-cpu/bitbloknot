// Мини-вопросы «Проверь себя» в шагах урока. Здесь только правила, без страницы, — их проверяют автотесты.
//
// Типы:
//   choice  { text, options: [...], answer: индекс, explain }           — выбрать один вариант (по умолчанию)
//   order   { type: "order", text, items: [...в верном порядке], explain } — расставить по порядку
//   match   { type: "match", text, pairs: [[левое, правое], ...], explain } — соединить пары
//   number  { type: "number", text, answer: число, unit?, explain }       — вписать число
import { parseNumber } from "./checker.js";

export const TYPES = ["choice", "order", "match", "number"];

export function typeOf(q) { return q.type || "choice"; }

/** Перестановка 0..n-1, которая точно не совпадает с исходным порядком (при n ≥ 2). */
export function shuffled(n, rng = Math.random) {
  const a = [...Array(n).keys()];
  if (n < 2) return a;
  do {
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
  } while (a.every((v, i) => v === i));
  return a;
}

/**
 * Проверка ответа. Возвращает { correct, wrong: [позиции с ошибкой], invalid?, message? }.
 *   choice: answer — индекс варианта
 *   order:  answer — массив индексов items в том порядке, как их поставил ученик
 *   match:  answer — массив: для каждой левой карточки i — индекс выбранной правой (или null)
 *   number: answer — строка из поля ввода
 */
export function check(q, answer) {
  const type = typeOf(q);
  if (type === "choice") {
    const ok = Number(answer) === q.answer;
    return { correct: ok, wrong: ok ? [] : [Number(answer)] };
  }
  if (type === "order") {
    const wrong = [];
    q.items.forEach((_, pos) => { if (answer[pos] !== pos) wrong.push(pos); });
    return { correct: wrong.length === 0 && answer.length === q.items.length, wrong };
  }
  if (type === "match") {
    const wrong = [];
    q.pairs.forEach((_, i) => { if (answer[i] !== i) wrong.push(i); });
    const empty = q.pairs.some((_, i) => answer[i] === null || answer[i] === undefined);
    if (empty) return { correct: false, wrong, invalid: true, message: "Соедини все пары" };
    return { correct: wrong.length === 0, wrong };
  }
  if (type === "number") {
    const v = parseNumber(answer);
    if (v === null) return { correct: false, wrong: [], invalid: true, message: "Впиши число" };
    const tol = Number(q.tolerance || 0);
    return { correct: Math.abs(v - Number(q.answer)) <= Math.max(tol, 1e-9), wrong: [] };
  }
  return { correct: false, wrong: [] };
}

/** Ошибки в оформлении вопроса (для автотеста контента). Пустой массив — всё хорошо. */
export function problems(q) {
  const out = [];
  const type = typeOf(q);
  if (!TYPES.includes(type)) return [`неизвестный тип ${type}`];
  if (!q.text) out.push("нет текста");
  if (!q.explain) out.push("нет объяснения");
  const uniq = a => new Set(a).size === a.length;
  if (type === "choice") {
    if (!Array.isArray(q.options) || q.options.length < 2) out.push("мало вариантов");
    else {
      if (!(q.answer >= 0 && q.answer < q.options.length)) out.push("ответ вне вариантов");
      if (!uniq(q.options)) out.push("повторяются варианты");
    }
  } else if (type === "order") {
    if (!Array.isArray(q.items) || q.items.length < 3) out.push("меньше 3 карточек");
    else if (!uniq(q.items)) out.push("повторяются карточки");
  } else if (type === "match") {
    if (!Array.isArray(q.pairs) || q.pairs.length < 3) out.push("меньше 3 пар");
    else {
      if (!uniq(q.pairs.map(p => p[0])) || !uniq(q.pairs.map(p => p[1]))) out.push("повторяются карточки");
      if (q.pairs.some(p => p.length !== 2 || !p[0] || !p[1])) out.push("пара не из двух частей");
    }
  } else if (type === "number") {
    if (!Number.isFinite(Number(q.answer)) || typeof q.answer !== "number") out.push("ответ не число");
  }
  return out;
}

/** Ответ текстом — для docs/QUESTIONS.md. */
export function answerText(q) {
  const type = typeOf(q);
  if (type === "choice") return q.options[q.answer];
  if (type === "order") return q.items.join(" → ");
  if (type === "match") return q.pairs.map(p => `${p[0]} — ${p[1]}`).join("; ");
  return `${q.answer}${q.unit ? " " + q.unit : ""}`;
}
