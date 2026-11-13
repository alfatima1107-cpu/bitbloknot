// Время занятий и цель дня.
// Считаем только активное время: вкладка открыта и ученик что-то делал за последнюю минуту.
// p.time = { "2026-11-13": 412 } — секунды по дням; p.goal — цель дня в минутах (по умолчанию 10).
import { today } from "./progress.js";

export const GOALS = [5, 10, 15, 20];
export const DEFAULT_GOAL = 10;
const WPM = 180;   // слов в минуту при чтении

/** Сколько минут займёт урок: чтение текста + по минуте на каждый вопрос и иллюстрацию. */
export function estimateMinutes(steps) {
  let words = 0, extra = 0;
  for (const st of steps) {
    const text = `${st.title || ""} ${st.body || ""} ${st.after || ""}`.replace(/<svg[\s\S]*?<\/svg>/g, " ").replace(/<[^>]+>/g, " ");
    words += text.split(/\s+/).filter(Boolean).length;
    if (st.question) extra += 1;
    if (st.widget) extra += 1;
  }
  return Math.max(1, Math.round(words / WPM + extra));
}

export function addSeconds(p, sec, day = today()) {
  p.time = p.time || {};
  p.time[day] = Math.round((p.time[day] || 0) + sec);
  // храним только последние 60 дней, чтобы карточка не разрасталась
  const days = Object.keys(p.time).sort();
  while (days.length > 60) delete p.time[days.shift()];
  return p.time[day];
}

export function goal(p) { return GOALS.includes(p.goal) ? p.goal : DEFAULT_GOAL; }

/** Прогресс цели дня: { minutes, goal, pct, done }. */
export function progressToday(p, day = today()) {
  const minutes = Math.floor(((p.time && p.time[day]) || 0) / 60);
  const g = goal(p);
  return { minutes, goal: g, pct: Math.min(100, Math.round(100 * minutes / g)), done: minutes >= g };
}

/** «4:07» из секунд. */
export function clockText(sec) {
  sec = Math.max(0, Math.round(sec));
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
}

/**
 * Таймер активности для страницы: каждые 5 секунд прибавляет время, если вкладка видна и
 * ученик двигал мышью, листал или нажимал клавиши за последнюю минуту. onTick(секунд сегодня) — для кольца цели.
 */
export function startTimer(p, onTick) {
  let lastAct = Date.now();
  const act = () => { lastAct = Date.now(); };
  ["pointerdown", "keydown", "scroll", "pointermove", "touchstart"].forEach(ev => addEventListener(ev, act, { passive: true }));
  const id = setInterval(() => {
    if (document.hidden || Date.now() - lastAct > 60000) return;
    onTick(addSeconds(p, 5));
  }, 5000);
  return () => clearInterval(id);
}
