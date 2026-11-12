// Проверяем «сервер» backend/Code.gs без интернета: подсовываем ему поддельную Google Таблицу.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash, randomUUID } from "node:crypto";
import vm from "node:vm";

/** Маленькая подделка SpreadsheetApp, CacheService и других сервисов Google. */
function fakeGoogle() {
  const sheets = {};
  const mkSheet = name => {
    const data = [];
    const sh = {
      appendRow: row => data.push(row.map(String)),
      setFrozenRows() {},
      getLastRow: () => data.length,
      getRange(a, b, h, w) {
        if (typeof a === "string") return { setNumberFormat() {} };
        return {
          setFontWeight() {},
          getValues: () => data.slice(a - 1, a - 1 + h).map(r => Array.from({ length: w }, (_, j) => r[b - 1 + j] ?? "")),
          setValue: v => { data[a - 1][b - 1] = String(v); },
        };
      },
      deleteRow: r => data.splice(r - 1, 1),
      data,
    };
    sheets[name] = sh;
    return sh;
  };
  const cache = new Map();
  return {
    sheets,
    SpreadsheetApp: { getActiveSpreadsheet: () => ({ getSheetByName: n => sheets[n] || null, insertSheet: mkSheet }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    CacheService: { getScriptCache: () => ({ get: k => cache.get(k) ?? null, put: (k, v) => cache.set(k, v), remove: k => cache.delete(k) }) },
    Utilities: {
      getUuid: () => randomUUID(),
      DigestAlgorithm: { SHA_256: "sha256" }, Charset: { UTF_8: "utf8" },
      computeDigest: (_alg, text) => [...createHash("sha256").update(text, "utf8").digest()].map(b => (b > 127 ? b - 256 : b)),
    },
    ContentService: { MimeType: { JSON: "json" }, createTextOutput: s => ({ setMimeType: () => s }) },
  };
}

function server() {
  const g = fakeGoogle();
  const ctx = vm.createContext({ ...g });
  vm.runInContext(readFileSync(new URL("../backend/Code.gs", import.meta.url), "utf-8"), ctx);
  const call = req => JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify(req) } }));
  return { call, sheets: g.sheets };
}

test("учитель: регистрация, вход, неверный пароль", () => {
  const { call, sheets } = server();
  const reg = call({ action: "teacherRegister", email: "T@School.test", password: "secret1" });
  assert.ok(reg.ok); assert.equal(reg.email, "t@school.test");
  assert.ok(!sheets.Teachers.data[1].includes("secret1"), "пароль не должен храниться открытым текстом");
  assert.equal(call({ action: "teacherRegister", email: "t@school.test", password: "secret1" }).ok, false);
  assert.equal(call({ action: "teacherLogin", email: "t@school.test", password: "wrong!!" }).ok, false);
  assert.ok(call({ action: "teacherLogin", email: "t@school.test", password: "secret1" }).ok);
  assert.equal(call({ action: "teacherRegister", email: "x", password: "secret1" }).ok, false);
  assert.equal(call({ action: "teacherRegister", email: "a@b.cd", password: "123" }).ok, false);
});

test("класс, ученики, вход ученика и сохранение прогресса", () => {
  const { call } = server();
  const { token } = call({ action: "teacherRegister", email: "t@s.test", password: "secret1" });
  const { class: c } = call({ action: "createClass", token, name: "7Б" });
  assert.match(c.code, /^[1-9]\d{5}$/);
  const { students } = call({ action: "addStudents", token, classId: c.id, names: ["Петя", "Аня", "=Хакер"] });
  assert.equal(students.length, 3);
  assert.equal(new Set(students.map(s => s.code)).size, 3);
  students.forEach(s => assert.match(s.code, /^\d{4}$/));

  const det = call({ action: "classDetail", token, classId: c.id });
  assert.ok(det.students.some(s => s.name === "Хакер"), "знак = в начале имени убирается (не формула)");

  const petya = students[0];
  const login = call({ action: "studentLogin", classCode: c.code, code: petya.code });
  assert.ok(login.ok); assert.equal(login.student.name, "Петя"); assert.equal(login.student.className, "7Б");
  assert.equal(login.student.progress, null);

  assert.ok(call({ action: "studentSave", classCode: c.code, code: petya.code, progress: { steps: { 8: { 0: "x" } } } }).ok);
  const again = call({ action: "studentLogin", classCode: c.code, code: petya.code });
  assert.deepEqual(again.student.progress.steps, { 8: { 0: "x" } });

  const list = call({ action: "teacherClasses", token });
  assert.equal(list.classes[0].count, 3);
  assert.ok(call({ action: "deleteStudent", token, classId: c.id, code: petya.code }).ok);
  assert.equal(call({ action: "studentLogin", classCode: c.code, code: petya.code }).ok, false);
  assert.equal(call({ action: "studentSave", classCode: c.code, code: petya.code, progress: {} }).ok, false);
});

test("чужой учитель не видит и не меняет класс", () => {
  const { call } = server();
  const a = call({ action: "teacherRegister", email: "a@s.test", password: "secret1" }).token;
  const b = call({ action: "teacherRegister", email: "b@s.test", password: "secret1" }).token;
  const { class: c } = call({ action: "createClass", token: a, name: "7А" });
  assert.equal(call({ action: "classDetail", token: b, classId: c.id }).ok, false);
  assert.equal(call({ action: "addStudents", token: b, classId: c.id, names: ["X"] }).ok, false);
  assert.equal(call({ action: "deleteClass", token: b, classId: c.id }).ok, false);
  assert.equal(call({ action: "teacherClasses", token: "fake" }).error, "Войдите заново");
  assert.equal(call({ action: "teacherClasses", token: b }).classes.length, 0);
});

test("защита от подбора: 5 неверных кодов — пауза", () => {
  const { call } = server();
  const token = call({ action: "teacherRegister", email: "t@s.test", password: "secret1" }).token;
  const { class: c } = call({ action: "createClass", token, name: "7В" });
  const [s] = call({ action: "addStudents", token, classId: c.id, names: ["Петя"] }).students;
  const wrong = s.code === "0000" ? "1111" : "0000";
  for (let i = 0; i < 5; i++) assert.equal(call({ action: "studentLogin", classCode: c.code, code: wrong }).ok, false);
  const locked = call({ action: "studentLogin", classCode: c.code, code: s.code });
  assert.equal(locked.ok, false); assert.ok(locked.locked > 0);
});

test("удаление класса удаляет учеников; слишком большой прогресс укорачивается", () => {
  const { call, sheets } = server();
  const token = call({ action: "teacherRegister", email: "t@s.test", password: "secret1" }).token;
  const { class: c } = call({ action: "createClass", token, name: "7Г" });
  const [s] = call({ action: "addStudents", token, classId: c.id, names: ["Петя", "Аня"] }).students;
  const attempts = Array.from({ length: 2000 }, (_, i) => ({ t: 8, k: "task", c: 1, e: null, l: 1, s: 1, ts: "2026-11-12T10:00:" + i }));
  assert.ok(call({ action: "studentSave", classCode: c.code, code: s.code, progress: { attempts } }).ok);
  const saved = call({ action: "studentLogin", classCode: c.code, code: s.code }).student.progress;
  assert.ok(saved.attempts.length < 2000 && saved.attempts.length > 0);
  assert.ok(JSON.stringify(saved).length <= 49000);
  assert.ok(call({ action: "deleteClass", token, classId: c.id }).ok);
  assert.equal(sheets.Students.data.length, 1);   // остался только заголовок
  assert.equal(sheets.Classes.data.length, 1);
});
