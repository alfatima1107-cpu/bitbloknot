/**
 * БитБлокнот — «сервер» на Google Apps Script.
 *
 * Этот скрипт живёт внутри Google Таблицы и хранит в ней всё, что должно быть видно
 * с разных компьютеров: учителей, классы, учеников и их прогресс.
 * Сайт (на GitHub Pages) отправляет сюда запросы вида {action: "...", ...}
 * и получает ответ {ok: true, ...} или {ok: false, error: "..."}.
 *
 * Листы таблицы (создаются сами при первом запросе):
 *   Teachers — учителя: почта, «соль» и хеш пароля (сам пароль не хранится!)
 *   Sessions — «пропуска» учителей после входа (действуют 30 дней)
 *   Classes  — классы: id, название, уникальный код из 6 цифр, почта учителя
 *   Students — ученики: класс, личный код из 4 цифр, имя, прогресс (JSON)
 *
 * Как установить — docs/GOOGLE-SHEETS.md.
 * Логика повторяет js/demo-backend.js — если меняешь одно, поменяй и другое.
 */

var SHEETS = {
  Teachers: ["email", "salt", "hash", "created"],
  Sessions: ["token", "email", "created"],
  Classes: ["id", "name", "code", "teacher", "created"],
  Students: ["classId", "code", "name", "progress", "created", "lastSeen"],
};
var MAX_FAILS = 5;          // столько неверных кодов подряд…
var LOCK_SECONDS = 30;      // …и вход в этот класс закрывается на 30 секунд (защита от подбора)
var SESSION_DAYS = 30;
var MAX_CELL = 49000;       // в ячейку Google Таблицы помещается до 50 000 символов

// ---------- вход в скрипт ----------

function doGet() {
  return json({ ok: true, app: "bitbloknot", message: "Сервер БитБлокнота работает" });
}

function doPost(e) {
  var req;
  try {
    req = JSON.parse(e.postData.contents);
  } catch (err) {
    return json({ ok: false, error: "Непонятный запрос" });
  }
  var lock = LockService.getScriptLock();   // запросы выполняются по очереди — никто не затрёт чужие данные
  try {
    lock.waitLock(20000);
    // Защита от повторов: у каждого «записывающего» запроса есть номер rid. Если такой запрос уже выполняли
    // (двойной щелчок, повтор сети), отдаём прошлый ответ и ничего не создаём второй раз.
    var cache = CacheService.getScriptCache();
    var rid = req.rid ? "rid:" + String(req.rid).slice(0, 80) : null;
    var seen = rid && cache.get(rid);
    if (seen) return json(JSON.parse(seen));
    var res = route(req);
    SpreadsheetApp.flush();   // записать всё в таблицу до того, как отпустим очередь: следующий запрос сразу увидит изменения
    if (rid) cache.put(rid, JSON.stringify(res), 600);
    return json(res);
  } catch (err) {
    return json({ ok: false, error: "Ошибка сервера: " + err.message });
  } finally {
    lock.releaseLock();
  }
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function fail(error, extra) {
  var res = { ok: false, error: error };
  for (var k in (extra || {})) res[k] = extra[k];
  return res;
}

// ---------- работа с листами ----------

function sheet(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange("A:Z").setNumberFormat("@");   // всё храним как текст: коды не теряют нули, даты не превращаются
    sh.appendRow(SHEETS[name]);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, SHEETS[name].length).setFontWeight("bold");
  }
  return sh;
}

/** Все строки листа как объекты {email: ..., hash: ..., _row: номер строки}. */
function rows(name) {
  var sh = sheet(name), cols = SHEETS[name];
  var n = sh.getLastRow() - 1;
  if (n <= 0) return [];
  var values = sh.getRange(2, 1, n, cols.length).getValues();
  return values.map(function (v, i) {
    var o = { _row: i + 2 };
    cols.forEach(function (c, j) {
      var x = v[j];
      o[c] = x === "" ? null : x instanceof Date ? x.toISOString() : String(x);
    });
    // Таблица могла превратить код «0123» в число 123 — возвращаем ведущие нули
    if (o.code != null && CODE_LEN[name]) o.code = padCode(o.code, CODE_LEN[name]);
    return o;
  });
}

/** Текст для ячейки: «=…» таблица приняла бы за формулу, поэтому такие символы в начале убираем. */
function safe(v) { return v == null ? "" : String(v).replace(/^[=+@]+/, ""); }

function add(name, obj) {
  // Не appendRow: он превращает «0123» в число 123. Сначала ставим строке формат «текст», потом пишем.
  var sh = sheet(name), cols = SHEETS[name];
  sh.getRange(sh.getLastRow() + 1, 1, 1, cols.length).setNumberFormat("@")
    .setValues([cols.map(function (c) { return safe(obj[c]); })]);
}

/** Длина кодов: личный код ученика — 4 цифры, код класса — 6. */
var CODE_LEN = { Students: 4, Classes: 6 };
function padCode(v, n) {
  var s = String(v == null ? "" : v).trim();
  return /^\d+$/.test(s) && s.length < n ? ("000000" + s).slice(-n) : s;
}

function setCell(name, row, col, value) {
  sheet(name).getRange(row, SHEETS[name].indexOf(col) + 1).setValue(safe(value));
}

function removeRow(name, row) { sheet(name).deleteRow(row); }

// ---------- помощники ----------

function now() { return new Date().toISOString(); }
function randDigits(n) { var s = ""; for (var i = 0; i < n; i++) s += Math.floor(Math.random() * 10); return s; }
function randToken() { return Utilities.getUuid(); }

/** Хеш пароля: SHA-256 от «соль + пароль», повторённый 1000 раз — так подбор становится очень медленным. */
function hashPassword(salt, password) {
  var h = salt + password;
  for (var i = 0; i < 1000; i++) {
    var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, h, Utilities.Charset.UTF_8);
    h = bytes.map(function (b) { return ("0" + (b & 0xff).toString(16)).slice(-2); }).join("");
  }
  return h;
}

function teacherBy(token) {
  if (!token) return null;
  var limit = new Date(Date.now() - SESSION_DAYS * 86400000).toISOString();
  var s = rows("Sessions").filter(function (r) { return r.token === token && r.created >= limit; })[0];
  return s ? s.email : null;
}

function ownClass(email, classId) {
  return rows("Classes").filter(function (c) { return c.id === classId && c.teacher === email; })[0] || null;
}

function studentsOf(classId) {
  return rows("Students").filter(function (s) { return s.classId === classId; })
    .sort(function (a, b) { return a.name.localeCompare(b.name, "ru"); });
}

function publicStudent(s) {
  var progress = null;
  try { progress = s.progress ? JSON.parse(s.progress) : null; } catch (e) { progress = null; }
  return { code: s.code, name: s.name, lastSeen: s.lastSeen, progress: progress };
}

function newSession(email) {
  var token = randToken();
  add("Sessions", { token: token, email: email, created: now() });
  return token;
}

// ---------- действия ----------

function route(r) {
  switch (r.action) {
    case "teacherRegister": {
      var email = String(r.email || "").trim().toLowerCase();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail("Введите правильный адрес почты");
      if (String(r.password || "").length < 6) return fail("Пароль — не меньше 6 символов");
      if (rows("Teachers").some(function (t) { return t.email === email; })) return fail("Учитель с такой почтой уже зарегистрирован. Войдите.");
      var salt = randToken();
      add("Teachers", { email: email, salt: salt, hash: hashPassword(salt, String(r.password)), created: now() });
      return { ok: true, token: newSession(email), email: email };
    }
    case "teacherLogin": {
      var em = String(r.email || "").trim().toLowerCase();
      var t = rows("Teachers").filter(function (x) { return x.email === em; })[0];
      if (!t || hashPassword(t.salt, String(r.password || "")) !== t.hash) return fail("Неверная почта или пароль");
      return { ok: true, token: newSession(em), email: em };
    }
    case "teacherLogout": {
      var ses = rows("Sessions").filter(function (s) { return s.token === r.token; })[0];
      if (ses) removeRow("Sessions", ses._row);
      return { ok: true };
    }
    case "teacherClasses": {
      var me = teacherBy(r.token);
      if (!me) return fail("Войдите заново");
      var students = rows("Students");
      var list = rows("Classes").filter(function (c) { return c.teacher === me; }).map(function (c) {
        return { id: c.id, name: c.name, code: c.code,
          count: students.filter(function (s) { return s.classId === c.id; }).length };
      }).sort(function (a, b) { return a.name.localeCompare(b.name, "ru"); });
      return { ok: true, email: me, classes: list };
    }
    case "createClass": {
      var me2 = teacherBy(r.token);
      if (!me2) return fail("Войдите заново");
      var name = String(r.name || "").trim();
      if (!name || name.length > 20) return fail("Название класса — от 1 до 20 символов, например 7Б");
      var used = {};
      rows("Classes").forEach(function (c) { used[c.code] = true; });
      var code;
      do { code = randDigits(6); } while (used[code] || code.charAt(0) === "0");
      var id = "c" + randToken().replace(/-/g, "").slice(0, 10);
      add("Classes", { id: id, name: name, code: code, teacher: me2, created: now() });
      return { ok: true, "class": { id: id, name: name, code: code, count: 0 } };
    }
    case "classDetail": {
      var me3 = teacherBy(r.token);
      if (!me3) return fail("Войдите заново");
      var c3 = ownClass(me3, r.classId);
      if (!c3) return fail("Класс не найден");
      return { ok: true, "class": { id: c3.id, name: c3.name, code: c3.code }, students: studentsOf(c3.id).map(publicStudent) };
    }
    case "renameClass": {
      var me4 = teacherBy(r.token);
      var c4 = me4 && ownClass(me4, r.classId);
      if (!c4) return fail("Класс не найден");
      var nn = String(r.name || "").trim();
      if (!nn || nn.length > 20) return fail("Название класса — от 1 до 20 символов");
      setCell("Classes", c4._row, "name", nn);
      return { ok: true };
    }
    case "deleteClass": {
      var me5 = teacherBy(r.token);
      var c5 = me5 && ownClass(me5, r.classId);
      if (!c5) return fail("Класс не найден");
      studentsOf(c5.id).map(function (s) { return s._row; }).sort(function (a, b) { return b - a; })
        .forEach(function (row) { removeRow("Students", row); });   // снизу вверх, чтобы номера строк не сдвигались
      removeRow("Classes", c5._row);
      return { ok: true };
    }
    case "addStudents": {
      var me6 = teacherBy(r.token);
      var c6 = me6 && ownClass(me6, r.classId);
      if (!c6) return fail("Класс не найден");
      var names = (r.names || []).map(function (n) { return String(n).trim(); }).filter(String);
      if (!names.length) return fail("Введите хотя бы одно имя");
      if (names.some(function (n) { return n.length > 40; })) return fail("Имя слишком длинное — не больше 40 символов");
      var existing = studentsOf(c6.id);
      if (existing.length + names.length > 60) return fail("В классе может быть не больше 60 учеников");
      var taken = {};
      existing.forEach(function (s) { taken[s.code] = true; });
      var added = names.map(function (n) {
        var code;
        do { code = randDigits(4); } while (taken[code]);
        taken[code] = true;
        add("Students", { classId: c6.id, code: code, name: n, created: now() });
        return { code: code, name: n, lastSeen: null, progress: null };
      });
      return { ok: true, students: added };
    }
    case "deleteStudent": {
      var me7 = teacherBy(r.token);
      var c7 = me7 && ownClass(me7, r.classId);
      if (!c7) return fail("Класс не найден");
      var st7 = studentsOf(c7.id).filter(function (s) { return s.code === padCode(r.code, 4); })[0];
      if (st7) removeRow("Students", st7._row);
      return { ok: true };
    }
    case "studentLogin": {
      var classCode = padCode(r.classCode, 6), pcode = padCode(r.code, 4);
      var cache = CacheService.getScriptCache();
      var lockedUntil = Number(cache.get("lock:" + classCode) || 0);
      var left = Math.ceil((lockedUntil - Date.now()) / 1000);
      if (left > 0) return fail("Слишком много неверных попыток. Подожди " + left + " с.", { locked: left });
      var c8 = rows("Classes").filter(function (c) { return c.code === classCode; })[0];
      var s8 = c8 && studentsOf(c8.id).filter(function (s) { return s.code === pcode; })[0];
      if (!s8) {
        var n = Number(cache.get("fail:" + classCode) || 0) + 1;
        if (n >= MAX_FAILS) {
          cache.put("lock:" + classCode, String(Date.now() + LOCK_SECONDS * 1000), LOCK_SECONDS);
          cache.remove("fail:" + classCode);
        } else {
          cache.put("fail:" + classCode, String(n), 600);
        }
        return fail(c8 ? "Неверный личный код" : "Класс с таким кодом не найден");
      }
      cache.remove("fail:" + classCode);
      setCell("Students", s8._row, "lastSeen", now());
      var pub = publicStudent(s8);
      pub.className = c8.name;
      pub.classCode = classCode;
      return { ok: true, student: pub };
    }
    case "studentSave": {
      var c9 = rows("Classes").filter(function (c) { return c.code === padCode(r.classCode, 6); })[0];
      var s9 = c9 && studentsOf(c9.id).filter(function (s) { return s.code === padCode(r.code, 4); })[0];
      if (!s9) return fail("Ученик не найден — возможно, учитель удалил его из класса");
      if (r.progress !== undefined) {
        var p = r.progress || {};
        var text = JSON.stringify(p);
        while (text.length > MAX_CELL && p.attempts && p.attempts.length) {   // слишком длинно — укорачиваем журнал задач
          p.attempts = p.attempts.slice(Math.ceil(p.attempts.length / 4));
          text = JSON.stringify(p);
        }
        setCell("Students", s9._row, "progress", text);
      }
      setCell("Students", s9._row, "lastSeen", now());
      return { ok: true };
    }
    default:
      return fail("Неизвестное действие");
  }
}
