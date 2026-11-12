// Проверка ответов и распознавание типичных ошибок.
import * as errors from "./errors.js";
import { fmt } from "./fmt.js";

/** «24 576» → 24576, «2,5» → 2.5. Если это не число — null. */
export function parseNumber(raw) {
  if (typeof raw === "number") return raw;
  const s = String(raw ?? "").trim().replace(/[\s ]/g, "").replace(",", ".");
  if (s === "" || !/^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(s)) return null;
  return Number(s);
}

/** Нормализация строкового ответа: без лишних пробелов, без разницы в регистре и «ё/е». */
export function normText(s) {
  s = String(s).split(/\s+/).filter(Boolean).join(" ").toLowerCase().replaceAll("ё", "е");
  s = s.replaceAll(" \\", "\\").replaceAll("\ ", "\\");
  return s.replace(/\+$/, "");
}

function numEqual(a, b, tol) {
  return Math.abs(a - b) <= Math.max(tol, 1e-9 * Math.max(1, Math.abs(b)));
}

/** Возвращает { correct, errorType, invalid, message? }. */
export function check(task, raw) {
  const kind = task.kind || "number";
  if (raw === null || raw === undefined || String(raw).trim() === "") {
    return { correct: false, errorType: null, invalid: true, message: "Сначала введи ответ" };
  }
  if (kind === "number") {
    const value = parseNumber(raw);
    if (value === null) {
      return { correct: false, errorType: null, invalid: true, message: "Ответ — это число. Введи только цифры" };
    }
    const tol = Number(task.tolerance || 0);
    const target = Number(task.exact ?? task.answer);
    if (numEqual(value, target, tol) || numEqual(value, Number(task.answer), 0)) {
      return { correct: true, errorType: null, invalid: false };
    }
    for (const [trap, et] of Object.entries(task.traps || {})) {
      const t = parseNumber(trap);
      if (t !== null && numEqual(value, t, tol)) return { correct: false, errorType: et, invalid: false };
    }
    return { correct: false, errorType: null, invalid: false };
  }
  // text и choice
  if (normText(raw) === normText(task.answer)) return { correct: true, errorType: null, invalid: false };
  for (const [trap, et] of Object.entries(task.traps || {})) {
    if (normText(raw) === normText(trap)) return { correct: false, errorType: et, invalid: false };
  }
  return { correct: false, errorType: null, invalid: false };
}

/** Подсказка после первой ошибки: точная, если ошибка распознана, иначе общая. */
export function feedbackHint(task, errorType) {
  return errors.hint(errorType) || task.hint || "Попробуй ещё раз: перечитай условие внимательно.";
}

export function displayAnswer(task) {
  const a = task.answer;
  if ((task.kind || "number") === "number") return `${fmt(parseNumber(a))} ${task.unit || ""}`.trim();
  return String(a);
}
