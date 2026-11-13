// Кабинет учителя: классы, коды входа, ученики и прогресс всего класса.
import * as A from "../adaptive.js";
import { DEMO, call } from "../api.js";
import * as courseMod from "../course.js";
import { normalize } from "../progress.js";
import { requireTeacher, teacherLogout } from "../session.js";
import { $, $$, esc, fillIcons, icon, page, param, setBack, toast } from "../ui.js";

const me = requireTeacher();
page({ teacher: me.email, home: "teacher.html", onLogout: teacherLogout, back: "index.html" });
const course = await courseMod.load();
const main = $("#main");

/** Запрос от имени учителя; если «пропуск» устарел — снова на вход. */
async function api(action, data = {}) {
  try {
    return await call(action, { token: me.token, ...data });
  } catch (ex) {
    if (/Войдите заново/.test(ex.message)) { localStorage.removeItem("bb-teacher"); location.replace("teacher-login.html"); }
    throw ex;
  }
}

/**
 * Кнопка на время запроса выключена и показывает, что идёт работа.
 * Сервер Google иногда думает 3–6 секунд — без этого второй щелчок создавал второй класс или второго ученика.
 */
async function busy(btn, text, fn) {
  if (!btn || btn.disabled) return;
  const html = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `${icon("clock")} ${text}`;
  try { return await fn(); } finally {
    if (btn.isConnected) { btn.disabled = false; btn.innerHTML = html; }
  }
}

/**
 * Подтверждение без системного окна confirm() (в некоторых браузерах оно не показывается и сразу отвечает «нет»):
 * первый щелчок превращает кнопку в «Точно удалить?», второй в течение 4 секунд — удаляет.
 */
function armed(btn, label = "Точно удалить?") {
  if (btn.dataset.armed) return true;
  const html = btn.innerHTML;
  btn.dataset.armed = "1";
  btn.classList.add("armed");
  btn.innerHTML = label;
  setTimeout(() => {
    if (btn.isConnected && !btn.disabled) { delete btn.dataset.armed; btn.classList.remove("armed"); btn.innerHTML = html; }
  }, 4000);
  return false;
}

const fail = ex => toast("alert", "Не получилось", ex.message);

function lastSeenText(iso) {
  if (!iso) return "ещё не входил";
  const d = new Date(iso);
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (days <= 0) return "сегодня";
  if (days === 1) return "вчера";
  return `${days} дн. назад`;
}

function masteryColor(m) {
  if (m >= 70) return "var(--ok)";
  if (m >= 30) return "var(--wr)";
  return m > 0 ? "var(--ac)" : "var(--line)";
}

// ---------- список классов ----------
async function showClasses() {
  history.replaceState(null, "", "teacher.html");
  setBack("index.html");
  main.innerHTML = `<p class="muted">Загружаю классы…</p>`;
  const { classes } = await api("teacherClasses");
  main.innerHTML = `
    ${DEMO ? `<div class="demo-note" style="margin-bottom:14px">Демо-режим: классы хранятся только в этом браузере. Ученики смогут войти только на этом компьютере.</div>` : ""}
    <div class="spread"><h1 style="margin:0">Мои классы</h1></div>
    <div class="topics" style="margin-top:14px" id="class-list">
      ${classes.map(c => `<a class="tcard class-card" href="?class=${esc(c.id)}" data-id="${esc(c.id)}">
          <div class="spread"><span class="num">код класса</span><span class="mono" style="color:var(--acs);font-weight:700">${esc(c.code)}</span></div>
          <div class="ttl" style="font-size:1.6rem;min-height:0">${esc(c.name)}</div>
          <div class="foot"><span>${c.count} ${c.count === 1 ? "ученик" : c.count >= 2 && c.count <= 4 ? "ученика" : "учеников"}</span><span>${icon("arrow-right")}</span></div>
        </a>`).join("")}
      <form class="tcard" id="create-form" style="cursor:default">
        <div class="num">новый класс</div>
        <input type="text" id="class-name" maxlength="20" placeholder="Например, 7Б" style="width:100%;margin:8px 0">
        <button class="btn primary block" type="submit">${icon("check")} Создать класс</button>
        <div class="error-text hidden" id="create-error"></div>
      </form>
    </div>
    ${classes.length ? "" : `<p class="muted" style="margin-top:14px">Создайте первый класс — система выдаст уникальный код из 6 цифр. Потом добавьте учеников, и каждый получит личный код из 4 цифр.</p>`}`;
  $$(".class-card").forEach(a => a.addEventListener("click", e => { e.preventDefault(); showClass(a.dataset.id); }));
  $("#create-form").addEventListener("submit", async e => {
    e.preventDefault();
    const name = $("#class-name").value.trim();
    const errEl = $("#create-error");
    if (!name) { errEl.textContent = "Введите название класса"; errEl.classList.remove("hidden"); return; }
    await busy(e.target.querySelector("button[type=submit]"), "Создаю…", async () => {
      try {
        const { class: c } = await api("createClass", { name });
        showClass(c.id, `Класс ${c.name} создан! Код класса: ${c.code}. Теперь добавьте учеников.`);
      } catch (ex) { errEl.textContent = ex.message; errEl.classList.remove("hidden"); }
    });
  });
}

// ---------- один класс: цифры класса, журнал за две недели, карточки учеников ----------
const COLORS = ["#e98aa8", "#6aa6f0", "#f2a65e", "#7b6cf6", "#4fbf8f", "#d38be0", "#5fb7c9", "#e7b54a", "#8a93a6"];
const initials = n => String(n).split(/\s+/).filter(Boolean).slice(0, 2).map(x => x[0]).join("").toUpperCase() || "?";
const avatar = (s, i, size = 34) => `<span class="tc-av" style="background:${COLORS[i % COLORS.length]};width:${size}px;height:${size}px">${esc(initials(s.name))}</span>`;
const isoDay = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const WD = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];

/** Чем ученик занимался по дням: { "2026-11-13": { steps, tasks, test, trainer } }. */
function activity(p) {
  const out = {};
  const day = ts => { const d = String(ts || "").slice(0, 10); if (!d) return null; return (out[d] = out[d] || { steps: 0, tasks: 0, test: null, trainer: 0 }); };
  for (const t of Object.values(p.steps || {})) for (const ts of Object.values(t || {})) { const d = day(ts); if (d) d.steps++; }
  for (const a of p.attempts || []) { const d = day(a.ts); if (d) d.tasks++; }
  for (const x of p.tests || []) { const d = day(x.ts); if (d) { const pct = Math.round(100 * x.score / (x.total || 10)); d.test = Math.max(d.test ?? 0, pct); } }
  for (const ts of Object.values(p.trainer || {})) { const d = day(ts); if (d) d.trainer++; }
  return out;
}
function chip(a) {
  if (!a) return "";
  if (a.test !== null) return `<span class="tc-chip ${a.test >= A.PASS ? "ok" : "bad"}">тест ${a.test}%</span>`;
  if (a.steps) return `<span class="tc-chip lesson">урок · ${a.steps}</span>`;
  if (a.tasks) return `<span class="tc-chip tasks">задачи · ${a.tasks}</span>`;
  if (a.trainer) return `<span class="tc-chip trainer">тренажёр</span>`;
  return "";
}
function daysAgo(iso) { return iso ? Math.floor((Date.now() - new Date(iso).getTime()) / 86400000) : null; }
/** Почему ученику нужна помощь (или null). */
function helpReason(r) {
  const ago = daysAgo(r.s.lastSeen);
  if (ago === null) return "ещё не входил";
  if (ago >= 5) return `не заходил ${ago} дн.`;
  const lastTest = [...(r.p.tests || [])].pop();
  if (lastTest && 100 * lastTest.score / (lastTest.total || 10) < A.PASS) return `тест ${Math.round(100 * lastTest.score / (lastTest.total || 10))}%`;
  const err = r.ps.topErrors[0];
  if (err && err.count >= 3) return err.reason.toLowerCase();
  return null;
}

let filter = "all";
async function showClass(id, notice = "") {
  history.replaceState(null, "", `teacher.html?class=${encodeURIComponent(id)}`);
  setBack(() => showClasses());
  main.innerHTML = `<p class="muted">Загружаю класс…</p>`;
  let data;
  try { data = await api("classDetail", { classId: id }); } catch (ex) { main.innerHTML = `<p class="error-text">${esc(ex.message)}</p>`; return; }
  const c = data.class;
  const rows = data.students.map((s, i) => {
    const p = normalize(s.progress);
    return { s, p, i, ov: A.overview(p, course), ps: A.profileStats(p, course), act: activity(p) };
  });
  rows.forEach(r => { r.help = helpReason(r); });
  const n = rows.length;
  const avg = n ? Math.round(rows.reduce((a, r) => a + r.ov.coursePct, 0) / n) : 0;
  const week = rows.filter(r => { const a = daysAgo(r.s.lastSeen); return a !== null && a < 7; }).length;
  const needHelp = rows.filter(r => r.help).length;

  // две недели: с понедельника прошлой недели
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const start = new Date(today); start.setDate(today.getDate() - ((today.getDay() + 6) % 7) - 7);
  const days = Array.from({ length: 14 }, (_, k) => { const d = new Date(start); d.setDate(start.getDate() + k); return d; });
  const todayIso = isoDay(today);
  const journal = n ? `<div class="tc-journal" style="--cols:${days.length}">
      <div class="tc-jh tc-jname">Ученик</div>
      ${days.map(d => `<div class="tc-jh ${isoDay(d) === todayIso ? "today" : ""}"><span>${WD[d.getDay()]}</span><b>${d.getDate()}</b></div>`).join("")}
      ${rows.map(r => `<div class="tc-jname">${avatar(r.s, r.i, 28)}<span>${esc(r.s.name)}</span></div>` +
        days.map(d => { const iso = isoDay(d), we = d.getDay() === 0 || d.getDay() === 6; return `<div class="tc-jc ${we ? "we" : ""} ${iso === todayIso ? "today" : ""}">${chip(r.act[iso])}</div>`; }).join("")).join("")}
    </div>` : "";

  const shown = rows.filter(r => filter === "help" ? r.help : filter === "away" ? (daysAgo(r.s.lastSeen) ?? 99) >= 7 : true);
  const cards = shown.map(r => {
    const pct = r.ov.coursePct, col = pct >= 70 ? "var(--ok)" : pct >= 40 ? "var(--wr)" : "var(--err)";
    const st = A.streak(r.p).current;
    return `<div class="card tc-card ${r.help ? "help" : ""}" data-row="${esc(r.s.code)}">
      <div class="tc-card-top">${avatar(r.s, r.i, 40)}<div class="tc-card-name"><b>${esc(r.s.name)}</b><span class="small muted">код ${esc(r.s.code)} · ${lastSeenText(r.s.lastSeen)}</span></div>
        <div class="tc-ring" style="--p:${pct};--c:${col}"><b>${pct}%</b></div></div>
      <div class="tc-tags">${r.help ? `<span class="tc-tag bad">${icon("alert")} ${esc(r.help)}</span>` : `<span class="tc-tag">${icon("flame")} серия ${st}</span>`}
        <span class="tc-tag">тем сдано: ${r.ps.passed}</span></div>
      <div class="tc-line"><i style="width:${pct}%;background:${COLORS[r.i % COLORS.length]}"></i></div>
      <button class="btn ghost small tc-del" type="button" data-del="${esc(r.s.code)}" title="Удалить ученика">${icon("x")}</button>
    </div>`;
  }).join("");

  main.innerHTML = `
    <a href="teacher.html" class="muted" id="back">${icon("arrow-left")} Все классы</a>
    ${notice ? `<div class="feedback ok" style="margin-top:12px"><div class="fh">${icon("check")} ${esc(notice)}</div></div>` : ""}
    <section class="card tc-head">
      <div class="tc-title"><h1>${esc(c.name)}</h1><span class="tc-tag">${icon("key")} код класса <b class="mono">${esc(c.code)}</b></span><span class="small muted">${n} уч.</span></div>
      <div class="row" style="gap:8px;flex-wrap:wrap">
        <a class="btn" href="print.html?class=${encodeURIComponent(c.id)}">${icon("printer")} Карточки входа</a>
        <button class="btn" type="button" id="refresh">${icon("refresh")} Обновить</button>
        <button class="btn ghost small" type="button" id="del-class" style="color:var(--err)">Удалить класс</button>
      </div>
    </section>
    ${n ? `<div class="tc-kpis">
      ${[["users", n, "учеников", "#7b6cf6"], ["chart", avg + "%", "средний прогресс", "#4fbf8f"], ["calendar", week, "заходили за неделю", "#6aa6f0"], ["alert", needHelp, "нужна помощь", "#e98aa8"]]
        .map(([ic, k, t, col]) => `<div class="card tc-kpi"><span class="tc-kpi-ic" style="--c:${col}">${icon(ic)}</span><div><b>${k}</b><span class="small muted">${t}</span></div></div>`).join("")}
    </div>
    <section class="card tc-block"><div class="spread"><h2>Журнал за две недели</h2><span class="small muted">
      <span class="tc-chip lesson">урок</span> <span class="tc-chip tasks">задачи</span> <span class="tc-chip trainer">тренажёр</span> <span class="tc-chip ok">тест сдан</span> <span class="tc-chip bad">тест не сдан</span></span></div>
      <div class="tc-journal-wrap">${journal}</div></section>
    <section class="tc-block"><div class="spread" style="margin-bottom:10px"><h2 style="margin:0">Ученики</h2>
      <div class="seg">${[["all", "Все"], ["help", `Нужна помощь · ${needHelp}`], ["away", "Не заходили"]].map(([k, t]) => `<button type="button" data-filter="${k}" class="${filter === k ? "on" : ""}">${t}</button>`).join("")}</div></div>
      <div class="tc-cards">${cards || `<p class="muted">Здесь пока никого.</p>`}</div></section>` :
      `<section class="card tc-block"><p class="muted">В классе пока нет учеников. Добавьте их ниже.</p></section>`}
    <div id="detail"></div>
    <form class="card stack tc-block" id="add-form">
      <h2 style="margin:0">Добавить учеников</h2>
      <p class="muted small" style="margin:0">Каждое имя — с новой строки, например «Иванов Петя». Каждый ученик получит свой личный код из 4 цифр.</p>
      <textarea id="names" rows="4" style="width:100%" placeholder="Иванов Петя&#10;Смирнова Аня&#10;Ким Даниил"></textarea>
      <div class="error-text hidden" id="add-error"></div>
      <div><button class="btn primary" type="submit">${icon("check")} Добавить</button></div>
    </form>`;
  fillIcons();

  $("#back").onclick = e => { e.preventDefault(); showClasses(); };
  $("#refresh").onclick = () => showClass(id);
  $$("[data-filter]").forEach(b => { b.onclick = () => { filter = b.dataset.filter; showClass(id); }; });
  $("#del-class").onclick = async e => {
    const btn = e.currentTarget;
    if (!armed(btn, `Удалить ${esc(c.name)} со всеми учениками?`)) return;
    await busy(btn, "Удаляю…", async () => {
      try { await api("deleteClass", { classId: id }); showClasses(); } catch (ex) { fail(ex); }
    });
  };
  $("#add-form").addEventListener("submit", async e => {
    e.preventDefault();
    const names = $("#names").value.split("\n").map(x => x.trim()).filter(Boolean);
    const errEl = $("#add-error");
    if (!names.length) { errEl.textContent = "Введите хотя бы одно имя"; errEl.classList.remove("hidden"); return; }
    await busy(e.target.querySelector("button[type=submit]"), "Добавляю…", async () => {
      try {
        const { students } = await api("addStudents", { classId: id, names });
        showClass(id, `Добавлено: ${students.length}. Распечатайте карточки входа, чтобы раздать коды.`);
      } catch (ex) { errEl.textContent = ex.message; errEl.classList.remove("hidden"); }
    });
  });
  $$("[data-del]").forEach(b => b.addEventListener("click", async e => {
    e.stopPropagation();
    const r = rows.find(x => x.s.code === b.dataset.del);
    if (!armed(b, "Удалить?")) return;
    await busy(b, "", async () => {
      try {
        await api("deleteStudent", { classId: id, code: r.s.code });
        b.closest(".tc-card").remove();
        showClass(id, `Ученик «${r.s.name}» удалён.`);
      } catch (ex) { fail(ex); }
    });
  }));
  $$("[data-row]").forEach(card => card.addEventListener("click", () => {
    $$("[data-row]").forEach(x => x.classList.toggle("picked-row", x === card));
    showDetail(rows.find(x => x.s.code === card.dataset.row));
  }));
}

function showDetail({ s, p, ov, ps }) {
  const errs = ps.topErrors.length
    ? `<ul style="margin:0;padding-left:1.2em">${ps.topErrors.map(e => `<li>${esc(e.reason)} — ${e.count} раз(а)</li>`).join("")}</ul>`
    : `<p class="muted" style="margin:0">Типичных ошибок пока не замечено.</p>`;
  const topics = ov.items.filter(i => i.stats.lastActivity).map(i => {
    const st = i.stats;
    return `<tr><td>${i.topic.num}. ${esc(i.topic.title)}</td><td>${st.stepsDone}/${st.stepsTotal}</td>
      <td>${st.tasksCount}</td><td>${st.bestTest !== null ? st.bestTest + "%" : "—"}</td><td>${esc(i.status.label)}</td></tr>`;
  }).join("");
  $("#detail").innerHTML = `<section class="card accent" style="margin-top:14px">
    <div class="spread"><h2 style="margin:0">${esc(s.name)}</h2><span class="muted small">личный код ${esc(s.code)}</span></div>
    <div class="stats-grid" style="margin-top:12px">
      <div class="stat"><div class="k">Решено задач</div><div class="v">${ps.tasks}</div></div>
      <div class="stat"><div class="k">С первой попытки</div><div class="v">${ps.firstTryPct !== null ? ps.firstTryPct + "%" : "—"}</div></div>
      <div class="stat"><div class="k">Сдано тем</div><div class="v">${ps.passed} из ${ps.topicsTotal}</div></div>
      <div class="stat"><div class="k">Серия дней</div><div class="v">${ps.streak.current} <span class="small muted">рекорд ${ps.streak.best}</span></div></div>
    </div>
    <h3 style="margin-top:14px">${icon("search")} Частые ошибки</h3>${errs}
    ${topics ? `<h3 style="margin-top:14px">Темы</h3><div class="table-wrap"><table class="progress-table detail-table">
      <thead><tr><th>Тема</th><th>Шаги</th><th>Задач</th><th>Тест</th><th>Статус</th></tr></thead><tbody>${topics}</tbody></table></div>` : ""}
  </section>`;
  $("#detail").scrollIntoView({ behavior: "smooth", block: "start" });
}

const cls = param("class");
if (cls) showClass(cls); else showClasses();
