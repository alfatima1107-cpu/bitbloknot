// Общие кусочки интерфейса для всех страниц: шапка с кнопкой «Назад», выбор темы и цвета, всплывающие сообщения.
import { icon, fillIcons } from "./icons.js";

/** Экранирует текст перед вставкой в HTML (защита от «взлома» через имя ученика). */
export function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/** Параметр из адреса страницы: topic.html?n=8 → param("n") === "8". */
export function param(name) {
  return new URLSearchParams(location.search).get(name);
}

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

// ---------- тема и цвет акцентов ----------
export const ACCENTS = [["blue", "Синий"], ["green", "Зелёный"], ["yellow", "Жёлтый"], ["red", "Красный"]];

function setLook(theme, accent) {
  const root = document.documentElement;
  if (theme) root.dataset.theme = theme;
  if (accent) root.dataset.accent = accent;
  try {
    localStorage.setItem("bb-theme", root.dataset.theme);
    localStorage.setItem("bb-accent", root.dataset.accent);
  } catch (e) { /* приватный режим — не страшно */ }
}

function themeControl() {
  return `<div class="theme-wrap">
    <button class="btn ghost small" id="theme-toggle" type="button" title="Тема и цвет" aria-expanded="false">${icon("palette")}<span class="hide-sm"> Оформление</span></button>
    <div class="theme-pop hidden" id="theme-pop" role="dialog" aria-label="Оформление">
      <div class="k">Тема</div>
      <div class="seg">
        <button class="btn small" type="button" data-theme-set="light">${icon("sun")} Светлая</button>
        <button class="btn small" type="button" data-theme-set="dark">${icon("moon")} Тёмная</button>
      </div>
      <div class="k">Цвет</div>
      <div class="swatches">${ACCENTS.map(([a, n]) => `<button class="swatch" type="button" data-accent="${a}" title="${n}" aria-label="${n}"></button>`).join("")}</div>
    </div>
  </div>`;
}

function bindTheme() {
  const btn = $("#theme-toggle"), pop = $("#theme-pop");
  if (!btn) return;
  const sync = () => {
    const r = document.documentElement;
    $$("[data-theme-set]", pop).forEach(b => b.classList.toggle("active", b.dataset.themeSet === r.dataset.theme));
    $$(".swatch", pop).forEach(b => b.classList.toggle("active", b.dataset.accent === r.dataset.accent));
  };
  btn.addEventListener("click", e => {
    e.stopPropagation();
    pop.classList.toggle("hidden");
    btn.setAttribute("aria-expanded", String(!pop.classList.contains("hidden")));
    sync();
  });
  pop.addEventListener("click", e => {
    e.stopPropagation();
    const t = e.target.closest("[data-theme-set]"), a = e.target.closest(".swatch");
    if (t) setLook(t.dataset.themeSet, null);
    if (a) setLook(null, a.dataset.accent);
    sync();
  });
  document.addEventListener("click", () => pop.classList.add("hidden"));
  document.addEventListener("keydown", e => { if (e.key === "Escape") pop.classList.add("hidden"); });
}

// ---------- шапка ----------
let backTarget = null;

/** Куда ведёт кнопка «Назад»: адрес страницы или функция. */
export function setBack(target) {
  backTarget = target;
  const b = $("#back-btn");
  if (b) b.classList.toggle("hidden", !target);
}

/**
 * Рисует шапку в <header id="topbar">.
 * opts.back    — куда ведёт кнопка «Назад» (адрес или функция); нет — кнопки нет (только на главной)
 * opts.user    — { name } вошедшего ученика
 * opts.teacher — e-mail вошедшего учителя
 * opts.streak  — серия дней
 * opts.home    — куда ведёт логотип
 * opts.onLogout — что делать по кнопке «Выйти»
 */
export function topbar(opts = {}) {
  const el = document.getElementById("topbar");
  if (!el) return;
  const { user = null, teacher = null, streak = 0, home = "index.html", onLogout = null, back = null } = opts;
  backTarget = back;
  let right = themeControl();
  if (user) {
    if (streak) right += `<span class="streak" title="Серия: дней подряд с занятиями">${icon("flame")} ${streak}</span>`;
    right += `<a class="me" href="profile.html" title="Личный кабинет">${icon("user")}<span class="me-name">${esc(user.name)}</span></a>`;
  }
  if (teacher) right += `<span class="me-name muted small">${esc(teacher)}</span>`;
  if (onLogout) right += `<button class="btn logout-btn" id="logout-btn" type="button">${icon("logout")}<span class="hide-sm"> Выйти</span></button>`;
  el.className = "topbar wrap spread";
  el.innerHTML = `<div class="left">
      <button class="btn back-btn ${back ? "" : "hidden"}" id="back-btn" type="button" title="Назад" aria-label="Назад">${icon("back")}</button>
      <a class="logo" href="${home}">${icon("notebook")} БитБлокнот</a>
    </div><div class="userbox">${right}</div>`;
  $("#back-btn").addEventListener("click", () => {
    if (typeof backTarget === "function") backTarget();
    else if (backTarget) location.href = backTarget;
  });
  bindTheme();
  if (onLogout) document.getElementById("logout-btn").addEventListener("click", onLogout);
}

/** Подвал и контейнер для всплывающих сообщений. */
export function footer() {
  if (!document.getElementById("toasts")) {
    document.body.insertAdjacentHTML("beforeend",
      `<footer class="footer wrap">БитБлокнот · интерактивный репетитор по информатике для 7 класса</footer>
       <div class="toasts" id="toasts" aria-live="polite"></div>`);
  }
}

/** Всплывающее сообщение внизу экрана (3 секунды). iconName — имя значка из js/icons.js. */
export function toast(iconName, title, desc = "") {
  const box = document.getElementById("toasts");
  if (!box) return;
  const t = document.createElement("div");
  t.className = "toast";
  t.innerHTML = `<span class="toast-icon">${icon(iconName)}</span><span><b>${esc(title)}</b><br><span class="small muted">${esc(desc)}</span></span>`;
  box.appendChild(t);
  requestAnimationFrame(() => t.classList.add("in"));
  setTimeout(() => { t.classList.remove("in"); setTimeout(() => t.remove(), 400); }, 3200);
}

/** Сообщения о новых достижениях — по очереди. */
export function badgeToasts(list) {
  (list || []).forEach((b, i) => setTimeout(() => toast(b.icon, `Новое достижение: ${b.title}!`, b.desc), i * 900));
}

/** Стандартная подготовка страницы: шапка, значки в разметке, подвал. */
export function page(opts) {
  topbar(opts);
  footer();
  fillIcons();
}

export { icon, fillIcons };
