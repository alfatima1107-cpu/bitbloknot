// Мини-вопросы новых видов: порядок, пары, число.
import { test } from "node:test";
import assert from "node:assert/strict";
import * as SQ from "../js/step-question.js";
import { Rng } from "../js/rng.js";

const order = { type: "order", text: "t", explain: "e", items: ["a", "b", "c", "d"] };
const match = { type: "match", text: "t", explain: "e", pairs: [["1", "x"], ["2", "y"], ["3", "z"]] };
const num = { type: "number", text: "t", explain: "e", answer: 24576, unit: "бит" };
const choice = { text: "t", explain: "e", options: ["a", "b"], answer: 1 };

test("выбор варианта", () => {
  assert.equal(SQ.typeOf(choice), "choice");
  assert.ok(SQ.check(choice, 1).correct);
  assert.deepEqual(SQ.check(choice, 0), { correct: false, wrong: [0] });
});

test("порядок: верный, неверный и где ошибки", () => {
  assert.ok(SQ.check(order, [0, 1, 2, 3]).correct);
  const r = SQ.check(order, [1, 0, 2, 3]);
  assert.equal(r.correct, false);
  assert.deepEqual(r.wrong, [0, 1]);
});

test("перемешивание никогда не даёт сразу верный порядок", () => {
  const rng = new Rng(7);
  for (let n = 2; n <= 6; n++) {
    for (let k = 0; k < 300; k++) {
      const a = SQ.shuffled(n, () => rng.random());
      assert.deepEqual([...a].sort(), [...Array(n).keys()]);
      assert.ok(a.some((v, i) => v !== i));
    }
  }
});

test("пары: все соединены верно, не все соединены, ошибка", () => {
  assert.ok(SQ.check(match, [0, 1, 2]).correct);
  const empty = SQ.check(match, [0, null, 2]);
  assert.ok(!empty.correct && empty.invalid);
  assert.deepEqual(SQ.check(match, [1, 0, 2]).wrong, [0, 1]);
});

test("число: пробелы, запятая, не число", () => {
  assert.ok(SQ.check(num, "24 576").correct);
  assert.ok(SQ.check(num, "24576").correct);
  assert.ok(!SQ.check(num, "24575").correct);
  assert.ok(SQ.check(num, "абв").invalid);
  assert.ok(SQ.check({ ...num, answer: 2.5 }, "2,5").correct);
});

test("проверка оформления вопросов", () => {
  for (const q of [order, match, num, choice]) assert.deepEqual(SQ.problems(q), []);
  assert.ok(SQ.problems({ ...order, items: ["a", "a", "b"] }).length);
  assert.ok(SQ.problems({ ...match, pairs: [["1", "x"], ["2", "x"], ["3", "y"]] }).length);
  assert.ok(SQ.problems({ ...num, answer: "5" }).length);
  assert.ok(SQ.problems({ ...choice, answer: 5 }).length);
  assert.ok(SQ.problems({ type: "draw", text: "t", explain: "e" }).length);
});

test("ответ текстом для docs/QUESTIONS.md", () => {
  assert.equal(SQ.answerText(order), "a → b → c → d");
  assert.equal(SQ.answerText(num), "24576 бит");
  assert.equal(SQ.answerText(match), "1 — x; 2 — y; 3 — z");
});
