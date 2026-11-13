// Личный кабинет ученика: статистика, достижения, частые ошибки.
import { owned } from "../achievements.js";
import { profileStats } from "../adaptive.js";
import { studentLogout } from "../session.js";
import { studentPage } from "../student-page.js";
import { $, esc, icon } from "../ui.js";

const { s, p, course } = await studentPage();
const st = profileStats(p, course);
const badges = owned(p);

$("#main").innerHTML = `
<section class="card">
  <div class="spread">
    <div class="row">
      <span class="profile-mark">${icon("user")}</span>
      <div><h1 style="margin:0">${esc(s.name)}</h1><div class="muted small">${s.solo ? "Учусь самостоятельно" : `Класс ${esc(s.className)}`} · личный кабинет</div></div>
    </div>
    <button class="btn logout-btn" type="button" id="logout2">${icon("logout")} Выйти</button>
  </div>
</section>

<div class="stats-grid" style="margin-top:14px">
  <div class="stat"><div class="k">Решено задач</div><div class="v">${st.tasks}</div></div>
  <div class="stat"><div class="k">С первой попытки</div><div class="v">${st.firstTryPct !== null ? st.firstTryPct + "%" : "—"}</div></div>
  <div class="stat"><div class="k">Сдано тем</div><div class="v">${st.passed} из ${st.topicsTotal}</div></div>
  <div class="stat"><div class="k">Серия дней</div><div class="v">${st.streak.current} <span class="small muted">рекорд ${st.streak.best}</span></div></div>
</div>
<p class="small muted" style="margin-top:6px">Серия — сколько дней подряд ты занимаешься. Один пропущенный день в неделю прощается.</p>

<section class="card" style="margin-top:14px">
  <h2>${icon("medal")} Мои достижения</h2>
  ${badges.length ? `<div class="badges">${badges.map(b => `<div class="badge-card"><div class="b-icon">${icon(b.icon)}</div><div><b>${esc(b.title)}</b><div class="small muted">${esc(b.desc)}</div></div></div>`).join("")}</div>`
    : `<p class="muted">Пока пусто. Решай задачи, сдавай темы и занимайся каждый день — значки появятся сами!</p>`}
</section>

${st.topErrors.length ? `<section class="card" style="margin-top:14px">
  <h2>${icon("search")} Частые ошибки</h2>
  <ul style="margin:0;padding-left:1.2em">${st.topErrors.map(e => `<li>Ты ${esc(e.reason)} — ${e.count} раз(а)</li>`).join("")}</ul>
</section>` : ""}`;

$("#logout2").onclick = studentLogout;
