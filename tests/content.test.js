// Проверяем содержание всех уроков: структура, ответы в вопросах, банки тестов.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import * as checker from "../js/checker.js";
import * as quiz from "../js/quiz.js";
import * as SQ from "../js/step-question.js";
import { Rng } from "../js/rng.js";
import { loadCourse } from "./helpers.js";

const course = loadCourse();

for (const t of course.topics) {
  const lesson = course.lessons[t.num];
  test(`тема ${t.num}: структура уроков`, () => {
    assert.equal(lesson.lessons.length, 4, `уроков ${lesson.lessons.length}`);
    lesson.lessons.forEach((l, li) => {
      assert.ok(l.title, `урок ${li + 1} без названия`);
      assert.ok(l.steps.length >= 4, `урок ${li + 1}: шагов ${l.steps.length}`);
    });
    assert.ok(lesson.cheatsheet.trim());
    const emoji = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{231A}-\u{23FF}]/u;
    assert.ok(!emoji.test(JSON.stringify(lesson)), "в уроках не должно быть эмодзи");
    lesson.steps.forEach((st, i) => {
      assert.ok(st.title && st.body && st.short, `шаг ${i + 1}`);
      const q = st.question;
      assert.ok(q, `шаг ${i + 1}: нет мини-вопроса`);
      assert.deepEqual(SQ.problems(q), [], `шаг ${i + 1}: ${st.title}`);
    });
    // в каждой теме есть вопросы всех новых видов: порядок, пары, число
    const types = new Set(lesson.steps.map(st => SQ.typeOf(st.question)));
    for (const ty of ["order", "match", "number"]) assert.ok(types.has(ty), `нет вопроса типа ${ty}`);
  });

  test(`тема ${t.num}: банк вопросов теста`, () => {
    const bank = lesson.test_bank;
    assert.ok(bank.length >= 20, `в банке ${bank.length} вопросов`);
    for (const e of bank) {
      const [q] = quiz.build({ ...t, generator: null }, { test_bank: [e] }, 1, new Rng(1));
      assert.ok(checker.check(q, String(q.answer)).correct, e.q);
      for (const [trap, et] of Object.entries(q.traps || {})) {
        const res = checker.check(q, trap);
        assert.ok(!res.correct && res.errorType === et, `${e.q} / ${trap}`);
      }
    }
  });

  test(`тема ${t.num}: сборка теста`, () => {
    const qs = quiz.build(t, lesson, quiz.TEST_SIZE, new Rng(t.num));
    assert.equal(qs.length, quiz.TEST_SIZE);
    assert.ok(new Set(qs.map(q => q.text)).size >= 8);
  });

  test(`тема ${t.num}: файлы тренажёра и иллюстраций на месте`, () => {
    for (const st of lesson.steps) {
      if (st.widget) assert.ok(existsSync(new URL(`../illustrations/${st.widget}.html`, import.meta.url)), st.widget);
    }
    if (t.trainer) assert.ok(existsSync(new URL(`../trainers/${t.trainer}.html`, import.meta.url)), t.trainer);
  });
}
