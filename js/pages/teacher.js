// Кабинет учителя: классы, коды входа, ученики и прогресс всего класса.
import * as A from "../adaptive.js";
import { DEMO, call } from "../api.js";
import * as courseMod from "../course.js";
import { normalize } from "../progress.js";
import { requireTeacher, teacherLogout } from "../session.js";
import { $, $$, esc, fillIcons, icon, page, param, setBack } from "../ui.js";

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
    try {
      const { class: c } = await api("createClass", { name });
      showClass(c.id, `Класс ${c.name} создан! Код класса: ${c.code}. Теперь добавьте учеников.`);
    } catch (ex) { errEl.textContent = ex.message; errEl.classList.remove("hidden"); }
  });
}

// ---------- один класс ----------
async function showClass(id, notice = "") {
  history.replaceState(null, "", `teacher.html?class=${encodeURIComponent(id)}`);
  setBack(() => showClasses());
  main.innerHTML = `<p class="muted">Загружаю класс…</p>`;
  let data;
  try { data = await api("classDetail", { classId: id }); } catch (ex) { main.innerHTML = `<p class="error-text">${esc(ex.message)}</p>`; return; }
  const c = data.class;
  const rows = data.students.map(s => {
    const p = normalize(s.progress);
    const ov = A.overview(p, course);
    const ps = A.profileStats(p, course);
    return { s, p, ov, ps };
  });

  main.innerHTML = `
    <a href="teacher.html" class="muted" id="back">${icon("arrow-left")} Все классы</a>
    ${notice ? `<div class="feedback ok" style="margin-top:12px"><div class="fh">${icon("check")} ${esc(notice)}</div></div>` : ""}
    <section class="card class-head" style="margin-top:12px">
      <div class="spread">
        <div><div class="muted small">Класс</div><h1 style="margin:0;font-size:2.2rem">${esc(c.name)}</h1></div>
        <div class="center"><div class="muted small">Код класса</div><div class="class-code mono">${esc(c.code)}</div></div>
        <div class="row">
          <a class="btn" href="print.html?class=${encodeURIComponent(c.id)}">${icon("printer")} Карточки входа</a>
          <button class="btn" type="button" id="refresh">${icon("refresh")} Обновить</button>
          <button class="btn ghost small" type="button" id="del-class" style="color:var(--err)">Удалить класс</button>
        </div>
      </div>
    </section>

    <section class="card" style="margin-top:14px">
      <h2>Ученики · ${rows.length}</h2>
      ${rows.length ? progressTable(rows) : `<p class="muted">В классе пока нет учеников. Добавьте их ниже.</p>`}
    </section>
    <div id="detail"></div>

    <form class="card stack" id="add-form" style="margin-top:14px">
      <h2 style="margin:0">Добавить учеников</h2>
      <p class="muted small" style="margin:0">Каждое имя — с новой строки, например «Иванов Петя». Каждый ученик получит свой личный код из 4 цифр.</p>
      <textarea id="names" rows="5" style="width:100%" placeholder="Иванов Петя&#10;Смирнова Аня&#10;Ким Даниил"></textarea>
      <div class="error-text hidden" id="add-error"></div>
      <div><button class="btn primary" type="submit">${icon("check")} Добавить</button></div>
    </form>`;
  fillIcons();

  $("#back").onclick = e => { e.preventDefault(); showClasses(); };
  $("#refresh").onclick = () => showClass(id);
  $("#del-class").onclick = async () => {
    if (!confirm(`Удалить класс ${c.name} вместе со всеми учениками и их прогрессом? Это нельзя отменить.`)) return;
    await api("deleteClass", { classId: id });
    showClasses();
  };
  $("#add-form").addEventListener("submit", async e => {
    e.preventDefault();
    const names = $("#names").value.split("\n").map(x => x.trim()).filter(Boolean);
    const errEl = $("#add-error");
    if (!names.length) { errEl.textContent = "Введите хотя бы одно имя"; errEl.classList.remove("hidden"); return; }
    try {
      const { students } = await api("addStudents", { classId: id, names });
      showClass(id, `Добавлено: ${students.length}. Распечатайте карточки входа, чтобы раздать коды.`);
    } catch (ex) { errEl.textContent = ex.message; errEl.classList.remove("hidden"); }
  });
  $$("[data-del]").forEach(b => b.addEventListener("click", async e => {
    e.stopPropagation();
    const r = rows.find(x => x.s.code === b.dataset.del);
    if (!confirm(`Удалить ученика «${r.s.name}» из класса? Его прогресс будет потерян.`)) return;
    await api("deleteStudent", { classId: id, code: r.s.code });
    showClass(id, `Ученик «${r.s.name}» удалён.`);
  }));
  $$("[data-row]").forEach(tr => tr.addEventListener("click", () => {
    $$("[data-row]").forEach(x => x.classList.toggle("picked-row", x === tr));
    showDetail(rows.find(x => x.s.code === tr.dataset.row));
  }));
}

function progressTable(rows) {
  const head = course.topics.map(t => `<th title="${esc(t.title)}" class="mono">${t.num}</th>`).join("");
  const body = rows.map(({ s, ov, ps }) => {
    const cells = ov.items.map(i => {
      const g = i.status.grade;
      return `<td title="${esc(i.topic.title)}: освоено ${i.mastery}%${g ? `, оценка ${g}` : ""}">
        <span class="cell" style="--c:${masteryColor(i.mastery)}">${g ? g : i.mastery ? i.mastery : ""}</span></td>`;
    }).join("");
    return `<tr data-row="${esc(s.code)}">
      <td class="nowrap"><b>${esc(s.name)}</b></td>
      <td class="mono">${esc(s.code)}</td>
      <td class="small muted nowrap">${lastSeenText(s.lastSeen)}</td>
      <td><div class="bar" style="width:70px"><i style="width:${ov.coursePct}%"></i></div><span class="small muted">${ov.coursePct}%</span></td>
      <td class="center">${ps.passed}</td>
      ${cells}
      <td><button class="btn ghost small" type="button" data-del="${esc(s.code)}" title="Удалить ученика">${icon("x")}</button></td>
    </tr>`;
  }).join("");
  return `<div class="table-wrap"><table class="progress-table">
    <thead><tr><th>Ученик</th><th>Код</th><th>Был</th><th>Курс</th><th title="Сдано тем">Сдано</th>${head}<th></th></tr></thead>
    <tbody>${body}</tbody></table></div>
    <p class="small muted" style="margin-top:8px">В клетках — оценка за тест (если сдан) или процент освоения темы. Нажмите на ученика, чтобы увидеть подробности.</p>`;
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
