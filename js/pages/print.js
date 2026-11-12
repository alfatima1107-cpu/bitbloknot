// Карточки входа для печати: код класса + имя + личный код каждого ученика.
import { call } from "../api.js";
import { requireTeacher } from "../session.js";
import { $, esc, icon, page, param } from "../ui.js";

const me = requireTeacher();
page({ teacher: me.email, home: "teacher.html", back: `teacher.html?class=${encodeURIComponent(param("class") || "")}` });
document.body.classList.add("print-page");

const { class: c, students } = await call("classDetail", { token: me.token, classId: param("class") });
document.title = `Карточки входа · ${c.name}`;
const site = location.href.replace(/print\.html.*$/, "");

$("#main").innerHTML = `<div class="spread no-print" style="margin-bottom:14px">
    <div><h1 style="margin:0">Карточки входа · ${esc(c.name)}</h1>
      <p class="muted small" style="margin:0">Разрежьте лист и раздайте каждому ученику его карточку.</p></div>
    <button class="btn primary" type="button" onclick="window.print()">${icon("printer")} Печатать</button>
  </div>
  ${students.length ? "" : `<p class="muted">В классе пока нет учеников.</p>`}
  <div class="cards-grid">
    ${students.map(s => `<div class="login-card print-card">
      <div class="lc-head"><span class="logo" style="font-size:1rem">${icon("notebook")} БитБлокнот</span><span class="small muted">класс ${esc(c.name)}</span></div>
      <div class="pc-name">${esc(s.name)}</div>
      <div class="lc-row"><span class="muted">Код класса</span><b class="mono">${esc(c.code)}</b></div>
      <div class="lc-row"><span class="muted">Личный код</span><b class="mono lc-pin">${esc(s.code)}</b></div>
      <div class="small muted center" style="margin-top:6px">${esc(site)} → «Я ученик»</div>
    </div>`).join("")}
  </div>`;
