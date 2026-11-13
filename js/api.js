// Связь с «сервером» — Google Таблицей через скрипт Apps Script (backend/Code.gs).
//
// Сайт на GitHub Pages — это просто файлы, базы данных у него нет. Поэтому всё, что должно быть
// видно с разных компьютеров (классы, ученики, прогресс), хранится в Google Таблице учителя-автора.
// Сайт отправляет запрос {action: "...", ...} и получает ответ {ok: true, ...} или {ok: false, error: "..."}.
//
// Если адрес скрипта не настроен (js/config.js), работает демо-режим (js/demo-backend.js) —
// те же действия, но данные лежат только в этом браузере.
import { API_URL } from "./config.js";

export const DEMO = !API_URL;

export class ApiError extends Error {
  constructor(message, extra = {}) { super(message); Object.assign(this, extra); }
}

let demo = null;
async function demoBackend() {
  demo ??= await import("./demo-backend.js");
  return demo;
}

/**
 * Вызов действия на сервере. keepalive — запрос долетит, даже если ученик сразу ушёл на другую страницу.
 * Content-Type text/plain — так браузер не делает лишний «предварительный» запрос, который Apps Script не понимает.
 */
/** Действия, которые что-то записывают: им даём номер запроса rid, чтобы сервер не выполнил их дважды. */
const WRITES = new Set(["teacherRegister", "createClass", "renameClass", "deleteClass", "addStudents", "deleteStudent"]);
const newRid = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export async function call(action, data = {}, { keepalive = false } = {}) {
  if (WRITES.has(action) && !data.rid) data = { ...data, rid: newRid() };
  let res;
  if (DEMO) {
    res = await (await demoBackend()).handle({ action, ...data });
  } else {
    let r;
    try {
      r = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action, ...data }),
        keepalive,
        redirect: "follow",
      });
    } catch (e) {
      throw new ApiError("Нет связи с сервером. Проверь интернет и попробуй ещё раз.", { network: true });
    }
    try { res = await r.json(); } catch (e) { throw new ApiError("Сервер ответил непонятно. Попробуй ещё раз."); }
  }
  if (!res || !res.ok) throw new ApiError(res?.error || "Что-то пошло не так", res || {});
  return res;
}
