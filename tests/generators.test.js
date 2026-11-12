// Проверяем генераторы задач: ответы правильные, ловушки распознаются, решение есть.
import { test } from "node:test";
import assert from "node:assert/strict";
import * as checker from "../js/checker.js";
import { ERRORS } from "../js/errors.js";
import { REGISTRY, make } from "../js/generators/index.js";
import { bitsFor } from "../js/generators/alphabet.js";
import { depth } from "../js/generators/image.js";
import { convert } from "../js/generators/units.js";
import { Rng } from "../js/rng.js";

const SEEDS = 300;

for (const key of Object.keys(REGISTRY).sort()) {
  for (const level of [1, 2, 3]) {
    test(`генератор ${key}, уровень ${level}: ответы и ловушки согласованы`, () => {
      for (let seed = 0; seed < SEEDS; seed++) {
        const t = make(key, level, new Rng(seed));
        const ctx = JSON.stringify({ key, level, seed, answer: t.answer });
        assert.ok(t.text && t.solution.length, ctx);
        assert.ok(checker.check(t, String(t.answer)).correct, ctx);          // правильный ответ принимается
        for (const [trap, et] of Object.entries(t.traps)) {                 // каждая ловушка распознаётся
          assert.ok(et in ERRORS, et);
          if (checker.parseNumber(trap) === null && t.kind === "number") continue;
          const res = checker.check(t, trap);
          assert.ok(!res.correct, `${ctx} ловушка ${trap}`);
          assert.equal(res.errorType, et, `${ctx} ловушка ${trap}`);
        }
        if (t.kind === "number" && !t.tolerance) assert.ok(Number.isInteger(Number(t.answer)), ctx);
        if (t.kind === "choice") {
          assert.ok(t.options.includes(t.answer), ctx);
          assert.equal(new Set(t.options).size, t.options.length, ctx);
        }
      }
    });
  }
}

test("известные значения формул", () => {
  assert.equal(convert(3, "Кбайт", "бит"), 24576);
  assert.equal(convert(2, "Мбайт", "Кбайт"), 2048);
  assert.equal(convert(16384, "бит", "Кбайт"), 2);
  assert.equal(bitsFor(33), 6);
  assert.equal(bitsFor(32), 5);
  assert.equal(bitsFor(2), 1);
  assert.equal(depth(5), 3);
  assert.equal(depth(256), 8);
});

test("ловушка «биты и байты» в переводе единиц", () => {
  const task = { kind: "number", answer: 24576, traps: { 3072: "bits_bytes", 24000: "kilo_1000" } };
  assert.equal(checker.check(task, "3072").errorType, "bits_bytes");
  assert.equal(checker.check(task, "24000").errorType, "kilo_1000");
  assert.ok(checker.check(task, "24 576").correct);
});

test("уровень меняет сложность", () => {
  const easy = new Set(Array.from({ length: 50 }, (_, s) => make("units", 1, new Rng(s)).unit));
  const hard = new Set(Array.from({ length: 50 }, (_, s) => make("units", 3, new Rng(s)).unit));
  assert.ok([...easy].every(u => u === "бит" || u === "байт"));
  assert.ok(hard.has("Кбайт") || hard.has("Мбайт"));
});

test("одинаковое зерно — одинаковые задачи", () => {
  assert.deepEqual(make("image", 3, new Rng(7)), make("image", 3, new Rng(7)));
});
