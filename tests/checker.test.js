// Проверка ответов, разбор чисел, красивая запись.
import { test } from "node:test";
import assert from "node:assert/strict";
import * as checker from "../js/checker.js";
import { fmt, plural } from "../js/fmt.js";

test("разбор чисел", () => {
  assert.equal(checker.parseNumber("24 576"), 24576);
  assert.equal(checker.parseNumber("2,5"), 2.5);
  assert.equal(checker.parseNumber(" 7 "), 7);
  assert.equal(checker.parseNumber("семь"), null);
  assert.equal(checker.parseNumber("12abc"), null);
});

test("пустой и нечисловой ответ", () => {
  const task = { kind: "number", answer: 5 };
  assert.ok(checker.check(task, "").invalid);
  assert.ok(checker.check(task, "пять").invalid);
});

test("погрешность при округлении", () => {
  const task = { kind: "number", answer: 11, exact: 10.99, tolerance: 0.51, traps: { 5.49: "stereo" } };
  assert.ok(checker.check(task, "11").correct);
  assert.ok(checker.check(task, "10,99").correct);
  assert.equal(checker.check(task, "5").errorType, "stereo");
});

test("текстовые ответы (пути)", () => {
  const task = { kind: "text", answer: "D:\\Школа\\Тест\\ответы.txt", traps: { "D:/Школа/Тест/ответы.txt": "path" } };
  assert.ok(checker.check(task, "d:\\школа\\тест\\ответы.txt").correct);
  assert.ok(checker.check(task, "  D:\\Школа\\Тест\\ответы.txt ").correct);
  assert.equal(checker.check(task, "D:/Школа/Тест/ответы.txt").errorType, "path");
});

test("подсказка: точная или общая", () => {
  const task = { hint: "Общая подсказка" };
  assert.equal(checker.feedbackHint(task, null), "Общая подсказка");
  assert.ok(checker.feedbackHint(task, "bits_bytes").includes("биты и байты"));
});

test("красивые числа и склонения", () => {
  assert.equal(fmt(24576), "24 576");
  assert.equal(fmt(2.5), "2,5");
  assert.equal(fmt(1234567.125), "1 234 567,125");
  assert.equal(plural(1, "раз", "раза", "раз"), "раз");
  assert.equal(plural(3, "раз", "раза", "раз"), "раза");
  assert.equal(plural(12, "раз", "раза", "раз"), "раз");
  assert.equal(plural(22, "раз", "раза", "раз"), "раза");
});
