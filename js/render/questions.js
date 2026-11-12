// Вопросы теста и разминки: разметка, проверка «на всё ли ответил», страница результата.
import { esc, icon } from "../ui.js";

const fmtDate = iso => (iso ? iso.slice(8, 10) + "." + iso.slice(5, 7) : "");

export function renderQuestions(questions) {
  return questions.map((q, i) => `<div class="card test-q" style="background:var(--card-2)">
    <div class="qn">Вопрос ${i + 1}</div>
    <div style="margin:4px 0 10px">${q.text}</div>
    ${q.kind === "choice"
      ? `<div class="row">${q.options.map(o => `<label class="choice"><input type="radio" name="${q.id}" value="${esc(o)}" style="margin-right:6px">${o}</label>`).join("")}</div>`
      : `<div class="row">
          <input type="text" name="${q.id}" inputmode="${q.kind === "number" ? "decimal" : "text"}"
            placeholder="${esc(q.kind === "number" ? "Ответ" : (q.placeholder || "Ответ"))}"
            style="${q.kind === "number" ? "width:160px" : "width:min(420px,100%)"}">
          <span class="muted">${esc(q.unit || "")}</span>
        </div>`}
  </div>`).join("");
}

/** Ответы из формы: { 0: "…", 1: "…" }. */
export function collectAnswers(form) {
  const out = {};
  for (const el of form.querySelectorAll("[name]")) {
    if (el.type === "radio") { if (el.checked) out[el.name] = el.value; } else out[el.name] = el.value;
  }
  return out;
}

/** Проверка, что ответ дан на все вопросы, и вызов onSubmit. */
export function bindQuestionForm(form, onSubmit) {
  const err = form.querySelector("#test-error");
  form.addEventListener("submit", e => {
    e.preventDefault();
    const names = new Set([...form.querySelectorAll("[name]")].map(el => el.name));
    let missing = null;
    for (const n of names) {
      const els = form.querySelectorAll(`[name="${n}"]`);
      const filled = [...els].some(el => (el.type === "radio" ? el.checked : el.value.trim() !== ""));
      if (!filled && !missing) missing = els[0];
    }
    if (missing) {
      err.classList.remove("hidden");
      missing.closest(".test-q").scrollIntoView({ behavior: "smooth", block: "center" });
      if (missing.type !== "radio") missing.focus();
      return;
    }
    onSubmit();
  });
  form.addEventListener("input", () => err.classList.add("hidden"));
  form.addEventListener("change", e => {
    if (e.target.type === "radio") {
      form.querySelectorAll(`[name="${e.target.name}"]`).forEach(r => r.closest(".choice").classList.toggle("picked", r.checked));
    }
    err.classList.add("hidden");
  });
}

/** Страница результата теста или разминки. */
export function renderResult({ t, score, total, results, info, review }) {
  const pct = Math.round(100 * score / total);
  const good = review ? info.success : info.passed;
  let head;
  if (review) {
    head = info.success
      ? `<h1>Разминка пройдена!</h1><p class="muted">${info.finished
        ? `Тема «${esc(t.title)}» закреплена надолго — повторений больше не нужно.`
        : `Следующее повторение — ${fmtDate(info.due)}.`}</p>`
      : `<h1>Нужно ещё потренироваться</h1><p class="muted">Повторим эту тему завтра. А сейчас можно заглянуть в шпаргалку или решить пару задач.</p>`;
  } else {
    head = info.passed
      ? `<h1>Тест сдан! Оценка <span class="grade g${info.grade}" style="font-size:1.2rem">${info.grade}</span></h1>
         <p class="muted">Тема «${esc(t.title)}» засчитана.${info.reviewDue ? ` Повторим её ${fmtDate(info.reviewDue)}, чтобы не забылась.` : ""}</p>`
      : `<h1>Пока не зачёт · оценка <span class="grade g${info.grade}" style="font-size:1.2rem">${info.grade}</span></h1>
         <p class="muted">Для зачёта нужно 70%. Посмотри разбор ошибок ниже, повтори урок или реши задачи — и пересдай.</p>`;
  }
  let html = `<div class="card"><div class="row" style="gap:20px;align-items:center">
    <div class="result-ring ${good ? "" : "bad"}"><b>${score}/${total}</b><span class="small muted">${pct}%</span></div>
    <div style="flex:1;min-width:240px">${head}
      <div class="row">
        <a class="btn primary" href="home.html">На главную</a>
        ${review ? "" : `<button class="btn" type="button" id="retest">${icon("refresh")} Пересдать</button>`}
        ${t.generator ? `<a class="btn" href="topic.html?n=${t.num}&stage=tasks">${icon("pencil")} Задачи</a>` : ""}
      </div>
    </div></div></div>
    <h2 style="margin-top:22px">Разбор</h2>`;
  results.forEach((r, i) => {
    html += `<div class="card ${r.correct ? "ok" : "bad"}" style="margin-bottom:10px;background:var(--card)">
      <div class="spread"><span class="small muted">Вопрос ${i + 1}</span>
        ${r.correct ? `<span style="color:var(--ok)">${icon("check")} верно</span>` : `<span style="color:var(--err)">${icon("x")} ошибка</span>`}</div>
      <div style="margin:4px 0">${r.q.text}</div>
      ${r.correct ? "" : `<div class="small">Твой ответ: <b>${esc(r.given || "—")}</b> · Правильно: <b style="color:var(--ok)">${esc(r.right)}</b></div>
        ${r.diagnosis ? `<div class="feedback warn" style="margin-top:6px"><div class="fh">${icon("search")} ${esc(r.diagnosis)}</div></div>` : ""}
        ${r.q.explain ? `<div class="small muted" style="margin-top:6px">${r.q.explain}</div>` : ""}`}
    </div>`;
  });
  return html;
}
