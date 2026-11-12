// «Умный репетитор» без ИИ — набор понятных правил.
//
// 1. Уровни сложности: 3 верных ответа подряд — уровень выше, 2 ошибки подряд — ниже.
// 2. Освоение темы (0–100 %): шаги урока 20 %, тренажёр 10 %, задачи 30 %, тест 40 %.
//    Если в теме нет тренажёра или задач, проценты делятся между остальными частями.
// 3. Интервальное повторение: сданная тема возвращается через 1, 3 и 7 дней.
// 4. Блок «Сегодня»: недоконченный урок → тест хуже 70 % → подошло повторение → следующая тема.
//
// Все функции работают с объектом прогресса p (см. js/progress.js) и курсом course = { topics, lessons }.
import * as errors from "./errors.js";
import { plural } from "./fmt.js";
import { MAX_ATTEMPTS, addDays, daysBetween, nowIso, today, topicState, touch } from "./progress.js";

export const PASS = 70;                     // зачёт по тесту, %
export const REVIEW_INTERVALS = [1, 3, 7];  // через сколько дней повторять сданную тему
export const UP_AFTER = 3;                  // столько верных подряд — уровень выше
export const DOWN_AFTER = 2;                // столько ошибок подряд — уровень ниже
export const MAX_LEVEL = 3;
export const LEVEL_NAMES = { 1: "лёгкий", 2: "средний", 3: "сложный" };

export function grade(pct) {
  if (pct >= 90) return 5;
  if (pct >= PASS) return 4;
  if (pct >= 50) return 3;
  return 2;
}

// ---------- запись результатов ----------

export function recordStep(p, topic, step) {
  const ts = touch(p, topic);
  p.steps[topic] ??= {};
  p.steps[topic][step] ??= ts;
}

export function recordTrainer(p, topic) {
  const ts = touch(p, topic);
  p.trainer[topic] ??= ts;
}

/**
 * Записывает решённую задачу и меняет уровень сложности. Возвращает новое состояние.
 * firstTry — решена с первой попытки; solved — решена в итоге (с первой или второй попытки).
 */
export function recordTask(p, topic, firstTry, errorType = null, kind = "task", solved = null) {
  const st = topicState(p, topic);
  let level = st.level;
  solved = solved === null ? firstTry : solved;
  const ts = touch(p, topic);
  p.attempts.push({ t: topic, k: kind, c: firstTry ? 1 : 0, e: errorType || null, l: level, s: solved ? 1 : 0, ts });
  if (p.attempts.length > MAX_ATTEMPTS) p.attempts.splice(0, p.attempts.length - MAX_ATTEMPTS);
  const c = p.counters;
  if (errorType) c.errors[errorType] = (c.errors[errorType] || 0) + 1;
  if (kind === "task") {
    c.tasks++;
    c.byTopic[topic] = (c.byTopic[topic] || 0) + 1;
    if (firstTry) { c.tasksOk++; c.run++; c.bestRun = Math.max(c.bestRun, c.run); } else c.run = 0;
    if (!firstTry && solved) c.fixed++;
  }
  let { ok, bad } = st, changed = 0;
  if (firstTry) {
    ok++; bad = 0;
    if (ok >= UP_AFTER && level < MAX_LEVEL) { level++; ok = 0; changed = +1; }
  } else {
    ok = 0; bad++;
    if (bad >= DOWN_AFTER && level > 1) { level--; bad = 0; changed = -1; }
  }
  if (kind === "task") Object.assign(st, { level, ok, bad });
  return { level, streak: ok, changed };
}

/** Ошибка в тесте: уровень не меняет, но попадает в «частые ошибки» и в подсказку блока «Сегодня». */
export function recordTestError(p, topic, errorType) {
  p.attempts.push({ t: topic, k: "test", c: 0, e: errorType, l: null, s: 0, ts: nowIso() });
  if (p.attempts.length > MAX_ATTEMPTS) p.attempts.splice(0, p.attempts.length - MAX_ATTEMPTS);
  p.counters.errors[errorType] = (p.counters.errors[errorType] || 0) + 1;
}

export function recordTest(p, topic, score, total) {
  p.tests.push({ t: topic, score, total, ts: touch(p, topic) });
  const pct = Math.round(100 * score / total);
  const passed = pct >= PASS;
  const st = topicState(p, topic);
  let due = null;
  if (passed && st.rs === null) {
    due = addDays(today(), REVIEW_INTERVALS[0]);
    st.rs = 0; st.rd = due;
  } else if (passed && st.rd) {
    due = st.rd;
  }
  return { pct, grade: grade(pct), passed, reviewDue: due };
}

/** Разминка-повторение: 2 из 3 — переходим к следующему интервалу, иначе повторим завтра. */
export function recordReview(p, topic, correct, total) {
  touch(p, topic);
  const st = topicState(p, topic);
  let stage = st.rs || 0;
  const success = correct * 3 >= total * 2;
  let due;
  if (success) {
    stage++;
    if (stage >= REVIEW_INTERVALS.length) {
      st.rs = stage; st.rd = null;
      return { success: true, finished: true, due: null };
    }
    due = addDays(today(), REVIEW_INTERVALS[stage]);
  } else {
    due = addDays(today(), 1);
  }
  st.rs = stage; st.rd = due;
  return { success, finished: false, due };
}

// ---------- статистика темы ----------

function bestTestPct(p, n) {
  let best = null, count = 0;
  for (const r of p.tests) {
    if (r.t !== n) continue;
    count++;
    const v = 100 * r.score / r.total;
    if (best === null || v > best) best = v;
  }
  return { best: best === null ? null : Math.round(best), count };
}

export function stats(p, t, course) {
  const n = t.num;
  const lesson = course.lessons[n] || { steps: [] };
  const stepsTotal = lesson.steps.length;
  const done = new Set(Object.keys(p.steps[n] || {}).map(Number));
  const recent = p.attempts.filter(a => a.t === n && a.k === "task").slice(-10);
  const { best, count } = bestTestPct(p, n);
  const st = p.topics[n] || { level: 1, ok: 0, rs: null, rd: null };
  return {
    steps: lesson.steps,
    lessonsTotal: (lesson.lessons || []).length,
    lessonsDone: (lesson.lessons || []).filter(l => l.steps.every((_, k) => done.has(l.start + k))).length,
    stepsTotal,
    stepsDone: [...done].filter(i => i < stepsTotal).length,
    doneSteps: done,
    trainerDone: Boolean(p.trainer[n]),
    tasksCount: p.counters.byTopic[n] || 0,
    accuracy: recent.length ? recent.reduce((s, a) => s + a.c, 0) / recent.length : null,
    bestTest: best,
    testsCount: count,
    lastActivity: p.last[n] || null,
    level: st.level,
    streak: st.ok,
    reviewStage: st.rs,
    reviewDue: st.rd,
  };
}

export function mastery(t, s) {
  const parts = [[20, s.stepsTotal ? s.stepsDone / s.stepsTotal : 0]];
  if (t.trainer) parts.push([10, s.trainerDone ? 1 : 0]);
  if (t.generator) parts.push([30, s.accuracy || 0]);
  parts.push([40, (s.bestTest || 0) / 100]);
  const totalW = parts.reduce((a, [w]) => a + w, 0);
  return Math.round(100 * parts.reduce((a, [w, v]) => a + w * v, 0) / totalW);
}

/** Что ученику делать дальше в теме: шаг урока, тренажёр, задачи или тест. */
export function nextStage(t, s) {
  for (let i = 0; i < s.stepsTotal; i++) {
    if (!s.doneSteps.has(i)) {
      const st = s.steps?.[i];
      const label = st && s.lessonsTotal > 1 ? `урок ${st.lesson + 1} · шаг ${st.lessonStep + 1}` : `шаг ${i + 1} из ${s.stepsTotal}`;
      return { kind: "step", index: i, label };
    }
  }
  if (t.trainer && !s.trainerDone) return { kind: "trainer", label: "тренажёр" };
  if (t.generator && s.tasksCount < 5) return { kind: "tasks", label: "задачи" };
  return { kind: "test", label: "тест" };
}

/**
 * Серия дней подряд. Один пропущенный день в любые 7 дней прощается.
 * Сегодняшний день ещё не закончился, поэтому если сегодня занятий не было, серию считаем со вчерашнего.
 * Два пропуска подряд или два пропуска ближе чем за неделю — серия сгорает.
 */
export function streakFromDays(days, tday) {
  if (!days.length) return 0;
  const set = new Set(days);
  let d = set.has(tday) ? tday : addDays(tday, -1);
  const first = [...days].sort()[0];
  let count = 0;
  const skips = [];
  while (d >= first) {
    if (set.has(d)) count++;
    else if (set.has(addDays(d, -1)) && skips.every(s => Math.abs(daysBetween(s, d)) >= 7)) skips.push(d);
    else break;
    d = addDays(d, -1);
  }
  return count;
}

/** Текущая серия и рекорд (рекорд запоминается в прогрессе). */
export function streak(p) {
  const cur = streakFromDays(p.days, today());
  p.bestStreak = Math.max(cur, p.bestStreak || 0);
  return { current: cur, best: p.bestStreak };
}

function passedTopics(p) {
  const best = {};
  for (const r of p.tests) best[r.t] = Math.max(best[r.t] ?? 0, 100 * r.score / r.total);
  return new Set(Object.entries(best).filter(([, v]) => v >= PASS).map(([k]) => Number(k)));
}

/** Статистика для личного кабинета (и для учителя). */
export function profileStats(p, course) {
  const c = p.counters;
  const top = Object.entries(c.errors).sort((a, b) => b[1] - a[1]).slice(0, 3)
    .filter(([et]) => errors.reason(et))
    .map(([et, count]) => ({ reason: errors.reason(et), count }));
  return {
    tasks: c.tasks,
    firstTryPct: c.tasks ? Math.round(100 * c.tasksOk / c.tasks) : null,
    passed: passedTopics(p).size,
    topicsTotal: course.topics.length,
    topErrors: top,
    streak: streak(p),
  };
}

export function topError(p, topic, days = 14) {
  const since = addDays(today(), -days);
  const cnt = {};
  for (const a of p.attempts) {
    if (a.t === topic && a.e && a.ts.slice(0, 10) >= since) cnt[a.e] = (cnt[a.e] || 0) + 1;
  }
  const best = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0];
  return best ? best : [null, 0];
}

function errorSentence(p, topic) {
  const [et, c] = topError(p, topic);
  const phrase = errors.reason(et);
  if (!phrase || c < 2) return null;
  return `Недавно ты ${c} ${plural(c, "раз", "раза", "раз")} ${phrase}.`;
}

// ---------- обзор курса и блок «Сегодня» ----------

export function overview(p, course) {
  const passed = new Set();
  const items = course.topics.map(t => {
    const s = stats(p, t, course);
    if (s.bestTest !== null && s.bestTest >= PASS) passed.add(t.num);
    return { topic: t, stats: s, mastery: mastery(t, s), stage: nextStage(t, s) };
  });

  const tday = today();
  const recs = [];
  // 1) недоконченный урок (самый свежий)
  const unfinished = items.filter(i => i.stats.lastActivity && i.stats.testsCount === 0)
    .sort((a, b) => (a.stats.lastActivity < b.stats.lastActivity ? 1 : -1));
  for (const i of unfinished) {
    recs.push({ kind: "continue", item: i, title: `Продолжить тему ${i.topic.num} «${i.topic.title}»`,
      reason: `Ты остановился на этапе «${i.stage.label}».`, action: "Продолжить", minutes: 10 });
  }
  // 2) тест сдан хуже 70 %
  for (const i of items) {
    const b = i.stats.bestTest;
    if (b !== null && b < PASS) {
      const reason = errorSentence(p, i.topic.num) || `Лучший результат теста — ${b} %, а для зачёта нужно ${PASS} %.`;
      recs.push({ kind: "retest", item: i, title: `Подтянуть тему ${i.topic.num} «${i.topic.title}»`,
        reason, action: "Повторить и пересдать", minutes: 10 });
    }
  }
  // 3) подошёл срок повторения
  for (const i of items) {
    const due = i.stats.reviewDue;
    if (due && due <= tday) {
      const reason = errorSentence(p, i.topic.num) || "Чтобы не забыть: повторение через несколько дней помогает запомнить надолго.";
      recs.push({ kind: "review", item: i, title: `Повторить «${i.topic.title}»`,
        reason: reason + " Разминка из трёх задач.", action: "Начать разминку", minutes: 3 });
    }
  }
  // 4) следующая тема по программе
  const fresh = items.filter(i => !i.stats.lastActivity);
  const ready = fresh.filter(i => i.topic.prereq.every(q => passed.has(q)));
  for (const i of (ready.length ? ready : fresh).slice(0, 1)) {
    const pre = i.topic.prereq;
    const reason = pre.length && passed.has(pre[0]) ? `Ты уже знаешь всё, что нужно: тема ${pre[0]} сдана.`
      : "Следующая тема по программе 7 класса.";
    recs.push({ kind: "next", item: i, title: `Начать тему ${i.topic.num} «${i.topic.title}»`,
      reason, action: "Начать", minutes: 15 });
  }

  const currentNum = recs.length && recs[0].kind === "continue" ? recs[0].item.topic.num : null;
  for (const i of items) i.status = status(i, passed, tday, currentNum);
  const coursePct = items.length ? Math.round(items.reduce((a, i) => a + i.mastery, 0) / items.length) : 0;
  return { items, today: recs[0] || null, also: recs[1] || null, coursePct, passed: passed.size };
}

function status(i, passed, tday, currentNum) {
  const s = i.stats, t = i.topic, b = s.bestTest;
  if (b !== null && b < PASS) return { kind: "retest", label: "повторить" };
  if (s.reviewDue && s.reviewDue <= tday) return { kind: "review", label: "повторить", grade: b !== null ? grade(b) : null };
  if (b !== null) return { kind: "passed", label: "сдана", grade: grade(b) };
  if (t.num === currentNum) return { kind: "current", label: i.stage.label };
  if (s.lastActivity) return { kind: "progress", label: "в процессе" };
  const missing = t.prereq.filter(q => !passed.has(q));
  if (missing.length) return { kind: "later", label: `лучше после темы ${missing[0]}` };
  return { kind: "new", label: "не начата" };
}

export { passedTopics, nowIso };
