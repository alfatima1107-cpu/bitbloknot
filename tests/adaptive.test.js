// Проверяем правила «умного репетитора», серию дней и достижения.
import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import * as A from "../js/adaptive.js";
import * as achievements from "../js/achievements.js";
import { addDays, emptyProgress } from "../js/progress.js";
import { loadCourse, resetClock, setToday } from "./helpers.js";

const course = loadCourse();
const topic = n => course.topics.find(t => t.num === n);
const titles = list => new Set(list.map(b => b.title));
afterEach(resetClock);

test("пятибалльная шкала", () => {
  assert.equal(A.grade(100), 5); assert.equal(A.grade(90), 5); assert.equal(A.grade(89), 4);
  assert.equal(A.grade(70), 4); assert.equal(A.grade(69), 3); assert.equal(A.grade(50), 3); assert.equal(A.grade(49), 2);
});

test("уровень растёт и падает", () => {
  const p = emptyProgress();
  let st;
  for (let i = 0; i < 3; i++) st = A.recordTask(p, 6, true);
  assert.equal(st.level, 2); assert.equal(st.changed, 1);
  for (let i = 0; i < 3; i++) st = A.recordTask(p, 6, true);
  assert.equal(st.level, 3);
  st = A.recordTask(p, 6, true);
  assert.equal(st.level, 3);                     // выше сложного не бывает
  A.recordTask(p, 6, false);
  st = A.recordTask(p, 6, false);
  assert.equal(st.level, 2); assert.equal(st.changed, -1);
});

test("веса освоения темы", () => {
  const p = emptyProgress(), t = topic(8);
  let s = A.stats(p, t, course);
  assert.equal(A.mastery(t, s), 0);
  for (let i = 0; i < s.stepsTotal; i++) A.recordStep(p, 8, i);
  assert.equal(A.mastery(t, A.stats(p, t, course)), 20);   // шаги — 20 %
  A.recordTrainer(p, 8);
  assert.equal(A.mastery(t, A.stats(p, t, course)), 30);   // + тренажёр 10 %
  A.recordTest(p, 8, 10, 10);
  assert.equal(A.mastery(t, A.stats(p, t, course)), 70);   // + тест 40 % (задач пока нет)
});

test("расписание повторений 1-3-7", () => {
  const p = emptyProgress(), day0 = "2026-11-10";
  setToday(day0);
  const info = A.recordTest(p, 8, 8, 10);
  assert.ok(info.passed); assert.equal(info.reviewDue, addDays(day0, 1));
  setToday(addDays(day0, 1));
  assert.equal(A.overview(p, course).today.kind, "review");
  let r = A.recordReview(p, 8, 2, 3);
  assert.equal(r.due, addDays(day0, 4));          // дальше через 3 дня
  r = A.recordReview(p, 8, 1, 3);
  assert.ok(!r.success); assert.equal(r.due, addDays(day0, 2));   // не вышло — завтра
  A.recordReview(p, 8, 3, 3);
  r = A.recordReview(p, 8, 3, 3);
  assert.ok(r.finished);
});

test("приоритеты блока «Сегодня»", () => {
  const p = emptyProgress();
  let ov = A.overview(p, course);
  assert.equal(ov.today.kind, "next"); assert.equal(ov.today.item.topic.num, 1);
  A.recordStep(p, 8, 0);
  ov = A.overview(p, course);
  assert.equal(ov.today.kind, "continue"); assert.equal(ov.today.item.topic.num, 8);
  A.recordTest(p, 8, 5, 10);
  A.recordTask(p, 8, false, "bits_bytes");
  A.recordTask(p, 8, false, "bits_bytes");
  ov = A.overview(p, course);
  assert.equal(ov.today.kind, "retest");
  assert.ok(ov.today.reason.includes("путал биты и байты"));
});

const D = "2026-11-20";
const days = (...offs) => offs.map(o => addDays(D, -o));

test("серия дней", () => {
  assert.equal(A.streakFromDays([], D), 0);
  assert.equal(A.streakFromDays(days(0, 1, 2), D), 3);
  assert.equal(A.streakFromDays(days(1, 2), D), 2);                        // сегодня ещё не занимался
  assert.equal(A.streakFromDays(days(0, 1, 3, 4), D), 4);                  // один пропуск прощается
  assert.equal(A.streakFromDays(days(0, 1, 4, 5), D), 2);                  // два дня подряд — сгорает
  assert.equal(A.streakFromDays(days(0, 2, 4), D), 2);                     // два пропуска за неделю
  assert.equal(A.streakFromDays(days(0, 1, 3, 4, 5, 6, 7, 8, 9, 11), D), 10);
});

test("каждый значок выдаётся один раз", () => {
  const p = emptyProgress();
  assert.deepEqual(achievements.check(p, course), []);
  A.recordStep(p, 8, 0);
  assert.deepEqual([...titles(achievements.check(p, course))], ["Первый шаг"]);
  assert.deepEqual(achievements.check(p, course), []);
  for (let i = 0; i < 10; i++) A.recordTask(p, 6, true);
  let got = titles(achievements.check(p, course));
  assert.ok(got.has("Снайпер") && got.has("Сложный уровень"));
  for (let i = 0; i < 10; i++) A.recordTask(p, 6, false, null, "task", true);
  assert.ok(titles(achievements.check(p, course)).has("Работа над ошибками"));
  for (let i = 0; i < 80; i++) A.recordTask(p, 7, true);
  assert.ok(titles(achievements.check(p, course)).has("Сотня"));
  A.recordTrainer(p, 8); A.recordTrainer(p, 9);
  got = titles(achievements.check(p, course));
  assert.ok(got.has("Художник") && got.has("Звукорежиссёр"));
});

test("значки за разделы, отличника, повторение и неделю", () => {
  const p = emptyProgress();
  for (const t of course.topics) if (t.section === 1) A.recordTest(p, t.num, 8, 10);
  let got = titles(achievements.check(p, course));
  assert.ok(got.has("Цифровой грамотей") && !got.has("Первая пятёрка"));
  A.recordTest(p, 4, 10, 10);
  assert.ok(titles(achievements.check(p, course)).has("Первая пятёрка"));
  for (const t of course.topics) A.recordTest(p, t.num, 9, 10);
  got = titles(achievements.check(p, course));
  assert.ok(got.has("Теоретик") && got.has("Технолог") && got.has("Отличник"));
  A.recordReview(p, 5, 3, 3);
  assert.ok(titles(achievements.check(p, course)).has("Не забыл!"));
  for (let k = 0; k < 7; k++) { setToday(addDays(D, -k)); A.recordStep(p, 3, k); }
  setToday(D);
  assert.ok(titles(achievements.check(p, course)).has("Неделя"));
  assert.ok(A.streak(p).best >= 7);
});
