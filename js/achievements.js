// Достижения (значки). Каждое правило — простая проверка по прогрессу ученика.
// check(p, course) проверяет все правила и возвращает значки, которые ученик получил только что.
// Значок выдаётся один раз и навсегда. icon — имя значка из js/icons.js.
import { passedTopics, streak } from "./adaptive.js";
import { nowIso } from "./progress.js";

export const CATALOG = [
  { code: "first_step", icon: "flag", title: "Первый шаг", desc: "Пройден первый шаг урока" },
  { code: "first_five", icon: "star", title: "Первая пятёрка", desc: "Тест сдан на «5»" },
  { code: "sniper", icon: "target", title: "Снайпер", desc: "10 задач подряд с первой попытки" },
  { code: "fixer", icon: "search", title: "Работа над ошибками", desc: "10 раз исправил ошибку со второй попытки" },
  { code: "hard_level", icon: "mountain", title: "Сложный уровень", desc: "Достигнут сложный уровень задач" },
  { code: "hundred", icon: "medal", title: "Сотня", desc: "Решено 100 задач" },
  { code: "not_forgot", icon: "brain", title: "Не забыл!", desc: "Пройдено первое повторение темы" },
  { code: "artist", icon: "brush", title: "Художник", desc: "Выполнен тренажёр «Пиксельный художник»" },
  { code: "sound", icon: "headphones", title: "Звукорежиссёр", desc: "Выполнен тренажёр «Звукозапись»" },
  { code: "section1", icon: "monitor", title: "Цифровой грамотей", desc: "Сданы все темы раздела 1" },
  { code: "section2", icon: "compass", title: "Теоретик", desc: "Сданы все темы раздела 2" },
  { code: "section3", icon: "wrench", title: "Технолог", desc: "Сданы все темы раздела 3" },
  { code: "week", icon: "flame", title: "Неделя", desc: "Серия 7 дней" },
  { code: "excellent", icon: "trophy", title: "Отличник", desc: "Сданы все 12 тем" },
];
export const BY_CODE = Object.fromEntries(CATALOG.map(a => [a.code, a]));

/** Какие условия выполнены прямо сейчас. */
export function earned(p, course) {
  const got = new Set();
  const topics = Object.values(p.topics);
  if (Object.values(p.steps).some(s => Object.keys(s).length)) got.add("first_step");
  if (p.tests.some(r => 100 * r.score / r.total >= 90)) got.add("first_five");
  if (p.counters.bestRun >= 10) got.add("sniper");
  if (p.counters.fixed >= 10) got.add("fixer");
  if (topics.some(s => s.level >= 3)) got.add("hard_level");
  if (p.counters.tasks >= 100) got.add("hundred");
  if (topics.some(s => s.rs !== null && s.rs >= 1)) got.add("not_forgot");
  if (p.trainer[8]) got.add("artist");
  if (p.trainer[9]) got.add("sound");
  const passed = passedTopics(p);
  for (const s of [1, 2, 3]) {
    if (course.topics.filter(t => t.section === s).every(t => passed.has(t.num))) got.add(`section${s}`);
  }
  if (streak(p).best >= 7) got.add("week");
  if (course.topics.every(t => passed.has(t.num))) got.add("excellent");
  return got;
}

/** Полученные значки по порядку получения. */
export function owned(p) {
  return Object.entries(p.achievements).sort((a, b) => (a[1] < b[1] ? -1 : 1))
    .filter(([code]) => BY_CODE[code]).map(([code, ts]) => ({ ...BY_CODE[code], ts }));
}

/** Выдаёт новые значки и возвращает их список (пустой, если новых нет). */
export function check(p, course) {
  const now = earned(p, course);
  const fresh = CATALOG.filter(a => now.has(a.code) && !p.achievements[a.code]);
  const ts = nowIso();
  for (const a of fresh) p.achievements[a.code] = ts;
  return fresh.map(a => ({ icon: a.icon, title: a.title, desc: a.desc }));
}
