// Кто сейчас вошёл на сайт.
//
// Ученик: после входа его карточка (имя, класс, прогресс) лежит в sessionStorage — это хранилище
// живёт, пока открыта вкладка. Закрыл браузер на школьном компьютере — следующий ученик тебя не увидит.
// Каждое действие сохраняется в карточку и сразу отправляется на сервер.
//
// Самостоятельное обучение (без класса): карточка лежит в localStorage этого браузера и никуда не отправляется.
// Перенести прогресс на другой компьютер можно файлом (solo.html: «Скачать копию» / «Загрузить копию»).
//
// Учитель: в localStorage хранится «пропуск» (token), который выдал сервер после входа по почте и паролю.
import { call } from "./api.js";
import { normalize } from "./progress.js";

const ST_KEY = "bb-student";
const T_KEY = "bb-teacher";
const SOLO_KEY = "bb-solo";


// ---------- ученик ----------

export function student() {
  try {
    let s = JSON.parse(sessionStorage.getItem(ST_KEY));
    if (!s) { const solo = soloCard(); s = solo && solo.active ? solo : null; }   // вход по коду класса важнее
    if (s) s.progress = normalize(s.progress);
    return s;
  } catch (e) { return null; }
}

// ---------- самостоятельное обучение ----------

/** Сохранённая карточка самостоятельного ученика (даже если он сейчас вышел) или null. */
export function soloCard() {
  try { return JSON.parse(localStorage.getItem(SOLO_KEY)); } catch (e) { return null; }
}
function keepSolo(s) { localStorage.setItem(SOLO_KEY, JSON.stringify(s)); }

/** Начать или продолжить самостоятельное обучение. Прогресс прошлого раза сохраняется. */
export function soloStart(name) {
  const old = soloCard();
  const s = { solo: true, active: true, name: String(name).trim().slice(0, 40) || "Ученик", className: "самостоятельно",
    progress: normalize(old?.progress) };
  sessionStorage.removeItem(ST_KEY);
  keepSolo(s);
  return s;
}

/** Копия прогресса в виде текста (для файла). */
export function soloExport() {
  const s = soloCard();
  return JSON.stringify({ app: "bitbloknot", kind: "solo", name: s?.name || "", progress: s?.progress || {} }, null, 1);
}

/** Загрузить копию прогресса из файла. Возвращает карточку или бросает ошибку. */
export function soloImport(text) {
  let d;
  try { d = JSON.parse(text); } catch (e) { throw new Error("Это не файл БитБлокнота"); }
  if (!d || d.app !== "bitbloknot" || typeof d.progress !== "object") throw new Error("Это не файл БитБлокнота");
  const s = { solo: true, active: true, name: String(d.name || "Ученик").slice(0, 40), className: "самостоятельно", progress: normalize(d.progress) };
  keepSolo(s);
  return s;
}

function keep(s) { sessionStorage.setItem(ST_KEY, JSON.stringify(s)); }

export async function studentLogin(classCode, code) {
  const res = await call("studentLogin", { classCode, code });
  const s = res.student;
  s.progress = normalize(s.progress);
  keep(s);
  return s;
}

/** Для страниц ученика: если никто не вошёл — на страницу входа. */
export function requireStudent() {
  const s = student();
  if (!s) { location.replace("student-login.html"); throw new Error("not logged in"); }
  return s;
}

let saving = Promise.resolve();
/**
 * Сохраняет карточку ученика: сразу — в этой вкладке, и следом — на сервере.
 * Запросы идут строго по очереди, чтобы старый прогресс не перезаписал новый.
 */
export function saveStudent(s) {
  if (s.solo) { keepSolo(s); return Promise.resolve(); }   // самостоятельный ученик: всё хранится в этом браузере
  keep(s);
  const body = { classCode: s.classCode, code: s.code, progress: s.progress };
  saving = saving.catch(() => {}).then(() => call("studentSave", body, { keepalive: true }));
  return saving;
}

export function studentLogout() {
  const solo = soloCard();
  if (solo && !sessionStorage.getItem(ST_KEY)) { solo.active = false; keepSolo(solo); }   // прогресс остаётся, просто выходим
  sessionStorage.removeItem(ST_KEY);
  location.href = "index.html";
}

// ---------- учитель ----------

export function teacher() {
  try { return JSON.parse(localStorage.getItem(T_KEY)); } catch (e) { return null; }
}

export function keepTeacher(token, email) {
  localStorage.setItem(T_KEY, JSON.stringify({ token, email }));
}

export function requireTeacher() {
  const t = teacher();
  if (!t) { location.replace("teacher-login.html"); throw new Error("not logged in"); }
  return t;
}

export async function teacherLogout() {
  const t = teacher();
  localStorage.removeItem(T_KEY);
  if (t) await call("teacherLogout", { token: t.token }).catch(() => {});
  location.href = "index.html";
}
