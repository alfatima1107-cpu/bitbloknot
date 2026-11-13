// Прогресс ученика — один объект, который хранится в облаке (Google Таблица) целиком.
//
// Раньше прогресс лежал в таблицах SQLite (steps_done, attempts, tests, topic_state…).
// Теперь это одна «карточка ученика» в формате JSON:
//
//   steps        — пройденные шаги уроков:   { "8": { "0": "2026-11-12T10:00:00", ... } }
//   trainer      — выполненные тренажёры:      { "8": "2026-11-12T10:05:00" }
//   attempts     — последние 200 решённых задач: [{ t, k, c, e, l, s, ts }]
//                  t — тема, k — вид ("task", "review", "quiz"), c — с первой попытки (1/0),
//                  e — тип ошибки, l — уровень, s — решена в итоге (1/0)
//   counters     — счётчики за всё время (журнал задач ограничен, а счётчики — нет)
//   tests        — результаты тестов:         [{ t, score, total, ts }]
//   topics       — состояние темы:            { "8": { level, ok, bad, rs, rd } }
//                  rs — этап повторения (null — тема не сдана), rd — дата следующего повторения
//   achievements — полученные значки:         { "sniper": "2026-11-12T..." }
//   days         — дни, когда ученик занимался: ["2026-11-10", "2026-11-12"]
//   last         — последняя активность в теме: { "8": "2026-11-12T..." }
//   bestStreak   — рекорд серии дней
//   time         — активное время по дням, в секундах: { "2026-11-13": 412 } (js/daily.js)
//   goal         — цель дня в минутах (5, 10, 15 или 20)
//   cards        — флеш-карточки словарика: { "Бит": { b: 2, d: "2026-11-16" } } (js/flashcards.js)

export const MAX_ATTEMPTS = 200;   // ячейка Google Таблицы вмещает до 50 000 символов

export function emptyProgress() {
  return {
    steps: {}, trainer: {}, attempts: [], tests: [], topics: {}, achievements: {}, days: [], last: {},
    counters: { tasks: 0, tasksOk: 0, fixed: 0, run: 0, bestRun: 0, byTopic: {}, errors: {} },
    bestStreak: 0, time: {}, goal: 10, cards: {},
  };
}

/** Дополняет старую или пустую карточку недостающими полями. */
export function normalize(p) {
  const e = emptyProgress();
  p = p && typeof p === "object" ? p : {};
  for (const k of Object.keys(e)) if (p[k] === undefined || p[k] === null) p[k] = e[k];
  for (const k of Object.keys(e.counters)) if (p.counters[k] === undefined) p.counters[k] = e.counters[k];
  return p;
}

// ---------- время (вынесено, чтобы в тестах можно было «перемотать» дни) ----------
export const clock = { now: () => new Date() };

const pad = n => String(n).padStart(2, "0");
/** Дата в виде «ГГГГ-ММ-ДД» по местному времени. */
export function isoDate(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
export function nowIso() {
  const d = clock.now();
  return `${isoDate(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
export function today() { return isoDate(clock.now()); }
/** addDays("2026-11-12", 3) → "2026-11-15". */
export function addDays(iso, n) {
  const [y, m, d] = iso.split("-").map(Number);
  return isoDate(new Date(y, m - 1, d + n));
}
/** Сколько дней от a до b. */
export function daysBetween(a, b) {
  const [y1, m1, d1] = a.split("-").map(Number), [y2, m2, d2] = b.split("-").map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
}

/** Отмечает активность: день для серии и время для темы. */
export function touch(p, topic) {
  const ts = nowIso(), d = ts.slice(0, 10);
  if (!p.days.includes(d)) { p.days.push(d); p.days.sort(); }
  if (topic !== undefined && topic !== null) p.last[topic] = ts;
  return ts;
}

/** Состояние темы (создаётся при первом обращении). */
export function topicState(p, topic) {
  if (!p.topics[topic]) p.topics[topic] = { level: 1, ok: 0, bad: 0, rs: null, rd: null };
  return p.topics[topic];
}
