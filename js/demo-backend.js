// ДЕМО-сервер: те же действия, что и backend/Code.gs (Google Apps Script), но данные хранятся
// в localStorage этого браузера. Нужен, чтобы сайт можно было попробовать без настройки Google Таблицы.
// Логика намеренно повторяет Code.gs один в один — если меняешь одно, поменяй и другое.

const KEY = "bb-demo-db";
const MAX_FAILS = 5, LOCK_SECONDS = 30;

function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch (e) { return null; }
}
function save(db) { localStorage.setItem(KEY, JSON.stringify(db)); }
function db0() { return { teachers: {}, sessions: {}, classes: {}, students: {}, fails: {} }; }

async function sha256(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
}
const randDigits = n => Array.from({ length: n }, () => Math.floor(Math.random() * 10)).join("");
const randToken = () => crypto.getRandomValues(new Uint32Array(4)).join("-");
const now = () => new Date().toISOString();
const fail = (error, extra = {}) => ({ ok: false, error, ...extra });

function teacherBy(db, token) {
  const email = db.sessions[token];
  return email && db.teachers[email] ? email : null;
}
const LOGIN_RE = /^[a-zа-яё0-9_.@-]{3,40}$/;
const loginOf = r => String(r.login ?? r.email ?? "").trim().toLowerCase();

function ownClass(db, email, classId) {
  const c = db.classes[classId];
  return c && c.teacher === email ? c : null;
}
function studentsOf(db, classId) {
  return Object.values(db.students).filter(s => s.classId === classId).sort((a, b) => a.name.localeCompare(b.name, "ru"));
}
const publicStudent = s => ({ code: s.code, name: s.name, lastSeen: s.lastSeen, progress: s.progress });

export async function handle(req) {
  const db = load() || db0();
  try {
    const res = await route(db, req);
    save(db);
    return res;
  } catch (e) {
    return fail(e.message || "Ошибка демо-сервера");
  }
}

async function route(db, r) {
  switch (r.action) {
    case "teacherRegister": {
      const email = loginOf(r);   // логин учителя (поле называется email ради совместимости)
      if (!LOGIN_RE.test(email)) return fail("Логин — от 3 до 30 символов: буквы, цифры, точка, дефис или _");
      if (String(r.password || "").length < 6) return fail("Пароль — не меньше 6 символов");
      if (db.teachers[email]) return fail("Такой логин уже занят. Придумайте другой или войдите.");
      const salt = randToken();
      db.teachers[email] = { salt, hash: await sha256(salt + r.password), created: now() };
      const token = randToken();
      db.sessions[token] = email;
      return { ok: true, token, email };
    }
    case "teacherLogin": {
      const email = loginOf(r);
      const t = db.teachers[email];
      if (!t || (await sha256(t.salt + r.password)) !== t.hash) return fail("Неверный логин или пароль");
      const token = randToken();
      db.sessions[token] = email;
      return { ok: true, token, email };
    }
    case "teacherLogout": {
      delete db.sessions[r.token];
      return { ok: true };
    }
    case "teacherClasses": {
      const email = teacherBy(db, r.token);
      if (!email) return fail("Войдите заново");
      const classes = Object.values(db.classes).filter(c => c.teacher === email)
        .map(c => ({ id: c.id, name: c.name, code: c.code, count: studentsOf(db, c.id).length }))
        .sort((a, b) => a.name.localeCompare(b.name, "ru"));
      return { ok: true, email, classes };
    }
    case "createClass": {
      const email = teacherBy(db, r.token);
      if (!email) return fail("Войдите заново");
      const name = String(r.name || "").trim();
      if (!name || name.length > 20) return fail("Название класса — от 1 до 20 символов, например 7Б");
      const used = new Set(Object.values(db.classes).map(c => c.code));
      let code;
      do { code = randDigits(6); } while (used.has(code) || code[0] === "0");
      const id = "c" + randToken().replaceAll("-", "").slice(0, 10);
      db.classes[id] = { id, name, code, teacher: email, created: now() };
      return { ok: true, class: { id, name, code, count: 0 } };
    }
    case "classDetail": {
      const email = teacherBy(db, r.token);
      if (!email) return fail("Войдите заново");
      const c = ownClass(db, email, r.classId);
      if (!c) return fail("Класс не найден");
      return { ok: true, class: { id: c.id, name: c.name, code: c.code }, students: studentsOf(db, c.id).map(publicStudent) };
    }
    case "renameClass": {
      const email = teacherBy(db, r.token);
      const c = email && ownClass(db, email, r.classId);
      if (!c) return fail("Класс не найден");
      const name = String(r.name || "").trim();
      if (!name || name.length > 20) return fail("Название класса — от 1 до 20 символов");
      c.name = name;
      return { ok: true };
    }
    case "deleteClass": {
      const email = teacherBy(db, r.token);
      const c = email && ownClass(db, email, r.classId);
      if (!c) return fail("Класс не найден");
      for (const [k, s] of Object.entries(db.students)) if (s.classId === c.id) delete db.students[k];
      delete db.classes[c.id];
      return { ok: true };
    }
    case "addStudents": {
      const email = teacherBy(db, r.token);
      const c = email && ownClass(db, email, r.classId);
      if (!c) return fail("Класс не найден");
      const names = (r.names || []).map(n => String(n).trim()).filter(Boolean);
      if (!names.length) return fail("Введите хотя бы одно имя");
      if (names.some(n => n.length > 40)) return fail("Имя слишком длинное — не больше 40 символов");
      const existing = studentsOf(db, c.id);
      if (existing.length + names.length > 60) return fail("В классе может быть не больше 60 учеников");
      const used = new Set(existing.map(s => s.code));
      const added = [];
      for (const name of names) {
        let code;
        do { code = randDigits(4); } while (used.has(code));
        used.add(code);
        const s = { classId: c.id, code, name, progress: null, created: now(), lastSeen: null };
        db.students[c.id + ":" + code] = s;
        added.push(publicStudent(s));
      }
      return { ok: true, students: added };
    }
    case "deleteStudent": {
      const email = teacherBy(db, r.token);
      const c = email && ownClass(db, email, r.classId);
      if (!c) return fail("Класс не найден");
      delete db.students[c.id + ":" + r.code];
      return { ok: true };
    }
    case "studentLogin": {
      const classCode = String(r.classCode || "").trim(), code = String(r.code || "").trim();
      const lockLeft = Math.ceil(((db.fails[classCode]?.until || 0) - Date.now()) / 1000);
      if (lockLeft > 0) return fail(`Слишком много неверных попыток. Подожди ${lockLeft} с.`, { locked: lockLeft });
      const c = Object.values(db.classes).find(x => x.code === classCode);
      const s = c && db.students[c.id + ":" + code];
      if (!s) {
        const f = db.fails[classCode] || { n: 0, until: 0 };
        f.n++;
        if (f.n >= MAX_FAILS) { f.n = 0; f.until = Date.now() + LOCK_SECONDS * 1000; }
        db.fails[classCode] = f;
        return fail(c ? "Неверный личный код" : "Класс с таким кодом не найден");
      }
      delete db.fails[classCode];
      s.lastSeen = now();
      return { ok: true, student: { ...publicStudent(s), className: c.name, classCode } };
    }
    case "studentSave": {
      const c = Object.values(db.classes).find(x => x.code === String(r.classCode));
      const s = c && db.students[c.id + ":" + r.code];
      if (!s) return fail("Ученик не найден — возможно, учитель удалил его из класса");
      if (r.progress !== undefined) s.progress = r.progress;
      s.lastSeen = now();
      return { ok: true };
    }
    default:
      return fail("Неизвестное действие");
  }
}
