// Самостоятельное обучение: карточка в браузере, выход без потери прогресса, перенос файлом.
import { test } from "node:test";
import assert from "node:assert/strict";

const store = () => { const m = new Map(); return { getItem: k => m.has(k) ? m.get(k) : null, setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k) }; };
globalThis.localStorage = store();
globalThis.sessionStorage = store();
globalThis.location = { href: "", replace() {} };
const S = await import("../js/session.js");

test("самостоятельный ученик: вход, сохранение, выход и возвращение", async () => {
  const s = S.soloStart("  Аня  ");
  assert.equal(s.name, "Аня");
  assert.ok(S.student().solo, "вошёл без кода класса");
  s.progress.steps[5] = { 0: "2026-11-13T10:00:00" };
  await S.saveStudent(s);   // без сервера — сразу в браузер
  S.studentLogout();
  assert.equal(S.student(), null, "после выхода никто не вошёл");
  assert.ok(S.soloCard().progress.steps[5], "но прогресс остался");
  S.soloStart("Аня");
  assert.ok(S.student().progress.steps[5], "вернулся — прогресс на месте");
});

test("вход по коду класса важнее самостоятельного", () => {
  S.soloStart("Аня");
  sessionStorage.setItem("bb-student", JSON.stringify({ classCode: "123456", code: "0001", name: "Петя", progress: {} }));
  assert.equal(S.student().name, "Петя");
  sessionStorage.removeItem("bb-student");
});

test("копия прогресса: скачать и загрузить", () => {
  S.soloStart("Аня");
  const text = S.soloExport();
  localStorage.removeItem("bb-solo");
  const s = S.soloImport(text);
  assert.equal(s.name, "Аня");
  assert.ok(s.progress.steps[5]);
  assert.throws(() => S.soloImport("{}"), /не файл/);
  assert.throws(() => S.soloImport("привет"), /не файл/);
});
