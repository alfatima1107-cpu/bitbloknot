// Общие помощники для автотестов: загрузка курса с диска и «машина времени».
import { readFileSync } from "node:fs";
import { LESSON_FILES, prepare } from "../js/course.js";
import { clock } from "../js/progress.js";

const root = new URL("../", import.meta.url);
export const readJson = rel => JSON.parse(readFileSync(new URL(rel, root), "utf-8"));

export function loadCourse() {
  const topics = readJson("content/topics.json");
  const lessons = Object.fromEntries(topics.map(t => [t.num, prepare(readJson(`content/${LESSON_FILES[t.num]}.json`))]));
  return { topics, lessons };
}

/** Устанавливает «сегодня» (ГГГГ-ММ-ДД) для всех функций, работающих с датами. */
export function setToday(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  clock.now = () => new Date(y, m - 1, d, 12, 0, 0);
}
export function resetClock() { clock.now = () => new Date(); }
