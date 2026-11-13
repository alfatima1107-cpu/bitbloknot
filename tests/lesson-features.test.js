// Новые функции страницы урока: словарик, флеш-карточки, время и цель дня.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as G from "../js/glossary.js";
import * as FC from "../js/flashcards.js";
import * as D from "../js/daily.js";
import { emptyProgress, normalize } from "../js/progress.js";
import { loadCourse } from "./helpers.js";

const glossary = JSON.parse(readFileSync(new URL("../content/glossary.json", import.meta.url), "utf-8"));
const course = loadCourse();

test("словарик: у каждой темы есть термины, без повторов, с определениями", () => {
  const names = new Set();
  for (const t of course.topics) assert.ok(G.forTopic(glossary, t.num).length >= 6, `тема ${t.num}: мало терминов`);
  for (const e of glossary) {
    assert.ok(e.term && e.def && e.stems?.length && e.topic >= 1 && e.topic <= 12, JSON.stringify(e));
    assert.ok(!names.has(e.term), `повтор: ${e.term}`);
    names.add(e.term);
  }
});

test("словарик: большая часть терминов встречается в уроках своей темы", () => {
  for (const t of course.topics) {
    const text = course.lessons[t.num].steps.map(s => `${s.title} ${s.body} ${s.after || ""}`).join(" ").replace(/<[^>]+>/g, " ");
    const terms = G.forTopic(glossary, t.num);
    const found = G.find(text, terms).length;
    assert.ok(found >= Math.ceil(terms.length * 0.6), `тема ${t.num}: найдено ${found} из ${terms.length}`);
  }
});

test("словарик: формы слова находятся, части других слов — нет", () => {
  const bit = { term: "Бит", stems: ["бит"], def: "x", topic: 5 };
  assert.equal(G.find("Один бит — это мало", [bit]).length, 1);
  assert.equal(G.find("восемь битов", [bit]).length, 1);
  assert.equal(G.find("Наш колибитр", [bit]).length, 0, "внутри слова не ищем");
  const ip = { term: "IP-адрес", stems: ["IP-адрес"], def: "x", topic: 3 };
  assert.equal(G.find("Узнай свой IP-адрес", [ip]).length, 1);
  assert.equal(G.search(glossary, "пиксел")[0].term, "Пиксель");
});

test("флеш-карточки: коробки и сроки повторения", () => {
  const p = normalize({});
  const terms = [{ term: "А" }, { term: "Б" }, { term: "В" }];
  const day = "2026-11-13";
  assert.equal(FC.due(p, terms, day).length, 3, "новые карточки показываем сразу");
  assert.deepEqual(FC.grade(p, "А", true, day), { b: 1, d: "2026-11-14" });
  assert.deepEqual(FC.grade(p, "А", true, "2026-11-14"), { b: 2, d: "2026-11-17" });
  assert.deepEqual(FC.grade(p, "Б", false, day), { b: 1, d: day }, "«Повторить» — ещё раз сегодня");
  assert.deepEqual(FC.due(p, terms, day).map(e => e.term), ["Б", "В"]);
  assert.equal(FC.due(p, terms, "2026-11-17").length, 3);
  for (let i = 0; i < 6; i++) FC.grade(p, "В", true, day);
  assert.equal(FC.state(p, "В").b, FC.INTERVALS.length - 1, "выше последней коробки не поднимается");
  assert.equal(FC.summary(p, terms, day).learned, 1);
});

test("время урока, цель дня, часы", () => {
  const steps = [{ title: "a", body: "<p>" + "слово ".repeat(360) + "</p>", question: {} }, { title: "b", body: "<p>кратко</p>", widget: "x" }];
  assert.equal(D.estimateMinutes(steps), 4, "360 слов = 2 мин + вопрос + иллюстрация");
  const p = normalize({});
  assert.equal(D.goal(p), 10);
  D.addSeconds(p, 300, "2026-11-13");
  assert.deepEqual(D.progressToday(p, "2026-11-13"), { minutes: 5, goal: 10, pct: 50, done: false });
  D.addSeconds(p, 300, "2026-11-13");
  assert.ok(D.progressToday(p, "2026-11-13").done);
  p.goal = 999;
  assert.equal(D.goal(p), D.DEFAULT_GOAL, "странная цель — значит по умолчанию");
  for (let i = 1; i <= 70; i++) D.addSeconds(p, 1, `2026-01-${String(i).padStart(2, "0")}`);
  assert.ok(Object.keys(p.time).length <= 60, "храним не больше 60 дней");
  assert.equal(D.clockText(247), "4:07");
});

test("карточка прогресса знает о новых полях", () => {
  const e = emptyProgress();
  assert.deepEqual([e.time, e.goal, e.cards], [{}, 10, {}]);
  const old = normalize({ steps: { 5: {} } });
  assert.ok(old.time && old.cards && old.goal === 10, "старые карточки дополняются");
});
