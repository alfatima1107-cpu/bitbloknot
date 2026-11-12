// Главная ученика: блок «Сегодня» и карта всех тем.
import { overview } from "../adaptive.js";
import { bySection } from "../course.js";
import { studentPage } from "../student-page.js";
import { $, esc, icon } from "../ui.js";

const { p, course } = await studentPage({ back: "index.html" });
const ov = overview(p, course);
const link = rec => (rec.kind === "review" ? `review.html?n=${rec.item.topic.num}` : `topic.html?n=${rec.item.topic.num}`);

let html = "";
const td = ov.today;
if (td) {
  html += `<section class="card accent today">
    <div class="label">${icon("bulb")} Сегодня репетитор советует</div>
    <h2>${esc(td.title)}</h2>
    <p class="muted">${esc(td.reason)} <span class="small">≈ ${td.minutes} мин</span></p>
    <div class="row">
      <a class="btn primary" href="${link(td)}">${esc(td.action)} ${icon("arrow-right")}</a>
      ${ov.also ? `<a class="btn" href="${link(ov.also)}">${esc(ov.also.title)}</a>` : ""}
    </div>
  </section>`;
} else {
  html += `<section class="card ok today">
    <div class="label">${icon("trophy")} Курс пройден!</div>
    <h2>Все темы сданы</h2>
    <p class="muted">Можно открыть любую тему и потренироваться ещё.</p>
  </section>`;
}

html += `<div style="margin-top:20px">
  <div class="spread small muted"><span>Весь курс · сдано тем: ${ov.passed} из ${ov.items.length}</span><span>${ov.coursePct}%</span></div>
  <div class="bar" style="margin-top:4px"><i style="width:${ov.coursePct}%"></i></div>
</div>`;

const byNum = Object.fromEntries(ov.items.map(i => [i.topic.num, i]));
for (const [sec, name, ts] of bySection(course.topics)) {
  html += `<div class="section-title">Раздел ${sec} · ${esc(name)}</div><div class="topics">`;
  for (const t of ts) {
    const it = byNum[t.num], st = it.status;
    const warn = st.kind === "retest" || st.kind === "review";
    const mark = st.kind === "passed" ? `<span style="color:var(--ok)">${icon("check")}</span>`
      : warn ? `<span style="color:var(--wr)">${icon("refresh")}</span>`
      : st.kind === "current" ? `<span style="color:var(--ac)">${icon("play")}</span>` : "";
    html += `<a class="tcard s-${st.kind}" href="topic.html?n=${t.num}">
      <div class="spread"><span class="num">тема ${t.num}</span>${mark}</div>
      <div class="ttl">${esc(t.title)}</div>
      <div class="bar ${warn ? "wr" : ""}"><i style="width:${it.mastery}%"></i></div>
      <div class="foot">
        <span>${warn ? `<span class="badge wr">${esc(st.label)}</span>` : esc(st.label)}</span>
        <span>${st.grade ? `<span class="grade g${st.grade}">${st.grade}</span>` : ""} ${it.mastery}%</span>
      </div>
    </a>`;
  }
  html += "</div>";
}
$("#main").innerHTML = html;
