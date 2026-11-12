// Кто сейчас вошёл на сайт.
//
// Ученик: после входа его карточка (имя, класс, прогресс) лежит в sessionStorage — это хранилище
// живёт, пока открыта вкладка. Закрыл браузер на школьном компьютере — следующий ученик тебя не увидит.
// Каждое действие сохраняется в карточку и сразу отправляется на сервер.
//
// Учитель: в localStorage хранится «пропуск» (token), который выдал сервер после входа по почте и паролю.
import { call } from "./api.js";
import { normalize } from "./progress.js";

const ST_KEY = "bb-student";
const T_KEY = "bb-teacher";


// ---------- ученик ----------

export function student() {
  try {
    const s = JSON.parse(sessionStorage.getItem(ST_KEY));
    if (s) s.progress = normalize(s.progress);
    return s;
  } catch (e) { return null; }
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
  keep(s);
  const body = { classCode: s.classCode, code: s.code, progress: s.progress };
  saving = saving.catch(() => {}).then(() => call("studentSave", body, { keepalive: true }));
  return saving;
}

export function studentLogout() {
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
