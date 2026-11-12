// Сборка тестов и разминок: вопросы из банка темы + задачи из генератора.
import * as checker from "./checker.js";
import * as errors from "./errors.js";
import { make } from "./generators/index.js";
import { Rng } from "./rng.js";

export const TEST_SIZE = 10;
export const GEN_IN_TEST = 3;   // сколько задач из генератора попадает в тест (если он есть у темы)

function fromBank(entry, rng) {
  if (entry.type === "number" || entry.type === "text") {
    return {
      kind: entry.type, text: entry.q, answer: entry.answer, unit: entry.unit || "",
      explain: entry.explain || "", traps: { ...(entry.traps || {}) }, tolerance: entry.tolerance || 0,
    };
  }
  const options = [...entry.options];
  const right = options[entry.answer];
  rng.shuffle(options);
  return { kind: "choice", text: entry.q, options, answer: right, explain: entry.explain || "", traps: { ...(entry.traps || {}) } };
}

function fromGenerator(key, level, rng) {
  const t = make(key, level, rng);
  t.explain = (t.solution || []).join(" → ");
  return t;
}

/** Тест темы: topic — из topics.json, lesson — JSON урока. */
export function build(topic, lesson, count = TEST_SIZE, rng = new Rng()) {
  const bank = lesson.test_bank || [];
  const gen = topic.generator;
  let nGen = gen ? Math.min(GEN_IN_TEST, count) : 0;
  if (count <= 3 && gen) nGen = count;   // разминка: все задачи из генератора
  const picked = rng.sample(bank, Math.min(bank.length, count - nGen));
  const questions = picked.map(e => fromBank(e, rng));
  const levels = [1, 2, 3, 2, 3, 1, 2, 3, 1, 2];
  while (questions.length < count && gen) questions.push(fromGenerator(gen, levels[questions.length % levels.length], rng));
  rng.shuffle(questions);
  questions.forEach((q, i) => { q.id = i; });
  return questions;
}

export function grade(questions, answers) {
  let score = 0;
  const results = questions.map(q => {
    const given = answers[q.id] ?? "";
    const res = checker.check(q, given);
    if (res.correct) score++;
    return { q, given, correct: res.correct, errorType: res.errorType, diagnosis: errors.hint(res.errorType), right: checker.displayAnswer(q) };
  });
  return { score, results };
}
