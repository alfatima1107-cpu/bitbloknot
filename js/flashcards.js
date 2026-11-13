// Флеш-карточки по словарику темы: «термин» на лицевой стороне, определение — на обороте.
// Повторение по коробкам Лейтнера: «Знаю» — карточка переезжает в следующую коробку и вернётся позже,
// «Повторить» — назад в первую коробку, покажем сегодня ещё раз.
// Состояние хранится в карточке прогресса: p.cards = { "Бит": { b: 2, d: "2026-11-16" } }.
import { addDays, today } from "./progress.js";

/** Через сколько дней вернётся карточка из коробки b. */
export const INTERVALS = [0, 1, 3, 7, 14];

export function state(p, term) { return (p.cards && p.cards[term]) || { b: 0, d: null }; }

/** Карточки, которые пора показать сегодня: новые и те, у кого подошёл срок. Сначала просроченные, потом новые. */
export function due(p, entries, day = today()) {
  return entries
    .map(e => ({ e, s: state(p, e.term) }))
    .filter(({ s }) => !s.d || s.d <= day)
    .sort((a, b) => (a.s.d ? 0 : 1) - (b.s.d ? 0 : 1) || (a.s.d || "").localeCompare(b.s.d || ""))
    .map(x => x.e);
}

/** Ответ ученика: knew = true («Знаю») или false («Повторить»). Возвращает новое состояние. */
export function grade(p, term, knew, day = today()) {
  p.cards = p.cards || {};
  const s = state(p, term);
  const b = knew ? Math.min(INTERVALS.length - 1, Math.max(1, s.b + 1)) : 1;
  const next = { b, d: knew ? addDays(day, INTERVALS[b]) : day };
  p.cards[term] = next;
  return next;
}

/** Сводка по теме: сколько выучено (коробка 3 и выше), сколько на повтор сегодня. */
export function summary(p, entries, day = today()) {
  const learned = entries.filter(e => state(p, e.term).b >= 3).length;
  return { total: entries.length, learned, due: due(p, entries, day).length };
}
