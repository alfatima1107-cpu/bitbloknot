// Страница темы: шаги урока, тренажёр, бесконечные задачи, тест и флеш-карточки.
// Всё рисуется прямо на странице, без перезагрузки: адрес меняется (topic.html?n=8&stage=tasks),
// чтобы кнопка «Назад» в браузере и обновление страницы работали как обычно.
// Оформление — css/lesson.css («стекло»), умное оглавление — js/lesson-nav.js.
import * as A from "../adaptive.js";
import * as checker from "../checker.js";
import { lesson as loadLesson } from "../course.js";
import * as D from "../daily.js";
import * as FC from "../flashcards.js";
import { make } from "../generators/index.js";
import * as G from "../glossary.js";
import { closeOverlays, initLessonNav } from "../lesson-nav.js";
import * as quiz from "../quiz.js";
import { studentPage } from "../student-page.js";
import { $, $$, badgeToasts, esc, fillIcons, icon, param } from "../ui.js";
import { renderQuestions, collectAnswers, bindQuestionForm, renderResult } from "../render/questions.js";
import { createKit, disposeAll } from "../three-kit.js";
import { renderStepQuestion } from "../render/step-question.js";

const { p, course, commit } = await studentPage();
const num = Number(param("n"));
const t = course.topics.find(x => x.num === num);
if (!t) { location.replace("home.html"); throw new Error("no topic"); }
const lesson = await loadLesson(num);
const glossary = await fetch("content/glossary.json", { cache: "no-cache" }).then(r => r.json()).catch(() => []);
const terms = G.forTopic(glossary, num);
const lessonMinutes = lesson.lessons.map(l => D.estimateMinutes(l.steps));
document.title = `${t.title} · БитБлокнот`;
document.body.classList.add("lesson-page");

// Помощники для тренажёров (раньше были в static/js/trainer-common.js)
window.BB = {
  icon: name => icon(name),
  three: (el, opts) => createKit(el, opts),   // объёмная сцена (js/three-kit.js)
  fmt(x) {
    if (typeof x !== "number" || !isFinite(x)) return String(x);
    return (Math.round(x * 1000) / 1000).toLocaleString("ru-RU");
  },
  feedback(el, cls, html) { el.className = "feedback " + cls; el.innerHTML = html; },
  trainerDone() {
    if (p.trainer[num]) return;
    A.recordTrainer(p, num);
    commit();
    const b = $("#trainer-badge");
    if (b) b.classList.remove("hidden");
  },
};
window.BB_TOAST = { badges: badgeToasts };

const stats = () => A.stats(p, t, course);
const go = (stage, i = 0) => { closeOverlays(); show(stage, i); window.scrollTo({ top: 0 }); };
const STAGES = ["step", "trainer", "tasks", "test", "cards"];
let current = { stage: null, index: 0 };

// урок, который сейчас проходит ученик: для праздничного экрана в конце урока
let session = { lesson: -1, start: Date.now(), firstTry: 0, answered: 0 };

initLessonNav();
let ticks = 0;
D.startTimer(p, () => { updateGoal(); if (++ticks % 12 === 0) commit(); });   // время сохраняем раз в минуту

function show(stage, index = 0) {
  disposeAll();   // старые 3D-сцены освобождают видеопамять
  const s = stats();
  if (!stage) { const n = A.nextStage(t, s); stage = n.kind; index = n.index ?? 0; }
  if (stage === "step" && !lesson.steps.length) stage = "test";
  if (stage === "step") index = Math.max(0, Math.min(index, lesson.steps.length - 1));
  if (stage === "trainer" && !t.trainer) stage = "test";
  if (stage === "tasks" && !t.generator) stage = "test";
  if (!STAGES.includes(stage)) stage = "test";
  current = { stage, index };
  const url = `topic.html?n=${num}&stage=${stage}` + (stage === "step" ? `&i=${index}` : "");
  history.replaceState(null, "", url);

  $("#main").innerHTML = frame(s, stage, index);
  const body = $("#stage");
  if (stage === "step") renderStep(body, s, index);
  else if (stage === "trainer") renderTrainer(body, s);
  else if (stage === "tasks") renderTasks(body, s);
  else if (stage === "cards") renderCards(body);
  else renderTest(body, s);
  bindFrame();
  updateGoal();
  fillIcons();
}

// ---------- рамка: оглавление, вкладки, инструменты ----------
function frame(s, stage, index) {
  const nowLesson = stage === "step" ? lesson.steps[index].lesson : -1;
  const passed = s.bestTest !== null && s.bestTest >= A.PASS;
  const due = FC.due(p, terms).length;

  // полное оглавление: уроки, у открытого урока — шаги
  let toc = "";
  lesson.lessons.forEach((l, li) => {
    const doneN = l.steps.filter((_, k) => s.doneSteps.has(l.start + k)).length;
    const full = doneN === l.steps.length;
    const firstOpen = l.steps.findIndex((_, k) => !s.doneSteps.has(l.start + k));
    const target = l.start + (firstOpen < 0 ? 0 : firstOpen);
    toc += `<a class="lp-lh ${li === nowLesson ? "open" : ""} ${full ? "done" : ""}" href="#" data-go="step:${target}" style="--lc: var(--c${(li % 6) + 1})">
      <span class="lp-ldot"></span><span class="lp-lt"><small>Урок ${li + 1} · ~${lessonMinutes[li]} мин</small>${esc(l.title)}</span>
      <span class="lp-count">${doneN}/${l.steps.length}</span></a>`;
    if (li === nowLesson) {
      toc += l.steps.map((st, k) => {
        const i = l.start + k, cls = i === index ? "now" : s.doneSteps.has(i) ? "done" : "";
        return `<a class="lp-st ${cls}" href="#" data-go="step:${i}">${icon(cls === "done" ? "check" : cls === "now" ? "dot" : "circle")}<span>${esc(st.short || st.title)}</span></a>`;
      }).join("");
    }
  });
  const extra = (key, ic, label, done, note = "") =>
    `<a class="lp-st lp-extra ${stage === key ? "now" : done ? "done" : ""}" href="#" data-go="${key}">${icon(done && stage !== key ? "check" : ic)}<span>${label}</span>${note ? `<span class="lp-count">${note}</span>` : ""}</a>`;
  const extras = (t.trainer ? extra("trainer", "flask", "Тренажёр", s.trainerDone) : "")
    + (t.generator ? extra("tasks", "pencil", "Задачи", s.tasksCount >= 5, s.tasksCount ? String(s.tasksCount) : "") : "")
    + extra("test", "list-check", "Тест", passed, s.bestTest !== null ? s.bestTest + "%" : "")
    + (terms.length ? extra("cards", "cards", "Карточки", false, due ? String(due) : "") : "");

  // свёрнутое оглавление: колонка цветных точек, по точке на шаг
  const rail = lesson.lessons.map((l, li) => `<div class="lp-rgroup" style="--lc: var(--c${(li % 6) + 1})" title="Урок ${li + 1}. ${esc(l.title)}">` +
    l.steps.map((_, k) => {
      const i = l.start + k;
      return `<a href="#" data-go="step:${i}" class="lp-rdot ${s.doneSteps.has(i) ? "done" : ""} ${stage === "step" && i === index ? "now" : ""}" aria-label="Урок ${li + 1}, шаг ${k + 1}"></a>`;
    }).join("") + `</div>`).join("");

  const tab = (key, ic, label) => `<a href="#" class="lp-tab ${stage === key ? "on" : ""}" data-go="${key}">${icon(ic)}<span>${label}</span></a>`;
  const tabs = tab("step", "book", "Урок") + (t.trainer ? tab("trainer", "flask", "Тренажёр") : "") + (t.generator ? tab("tasks", "pencil", "Задачи") : "")
    + tab("test", "list-check", "Тест") + (terms.length ? tab("cards", "cards", "Карточки") : "");

  // подпись для нижней панели телефона
  let barLabel = "", barDots = "";
  if (stage === "step") {
    const st = lesson.steps[index], les = lesson.lessons[st.lesson];
    barLabel = `Урок ${st.lesson + 1} · шаг ${st.lessonStep + 1}/${les.steps.length}`;
    barDots = les.steps.map((_, k) => `<i class="${les.start + k === index ? "now" : s.doneSteps.has(les.start + k) ? "done" : ""}"></i>`).join("");
  } else barLabel = { trainer: "Тренажёр", tasks: "Задачи", test: "Тест", cards: "Карточки" }[stage];

  const ring = cls => `<div class="lp-ring ${cls}" role="img" aria-label="Цель дня"><b></b></div>`;

  return `<div class="lp">
    <div class="lp-navcell">
      <nav class="lp-toc glass" aria-label="Содержание темы">
        <div class="lp-toc-head"><b>Содержание</b><span class="row" style="gap:2px">
          <button class="lp-ib lp-desk" type="button" data-nav="pin" title="Не сворачивать само">${icon("pin")}</button>
          <button class="lp-ib lp-desk" type="button" data-nav="hide" title="Скрыть оглавление">${icon("sidebar")}</button>
          <button class="lp-ib lp-mob" type="button" data-nav="close" aria-label="Закрыть">${icon("x")}</button></span></div>
        <div class="lp-toc-list">${toc}<div class="lp-sep"></div>${extras}</div>
        <div class="lp-goal">${ring("")}<div><b>Цель дня</b><div class="small muted lp-goal-text"></div></div></div>
      </nav>
      <nav class="lp-rail glass" aria-label="Содержание, свёрнуто">
        <button class="lp-ib" type="button" data-nav="peek" title="Открыть содержание">${icon("list")}</button>
        <div class="lp-rdots">${rail}</div>
        ${ring("small")}
      </nav>
    </div>
    <section class="lp-main">
      <div class="lp-head glass">
        <a href="home.html" class="lp-ib" aria-label="К темам">${icon("arrow-left")}</a>
        <div class="lp-crumb"><b>Тема ${t.num} · ${esc(t.title)}</b><span class="small muted">освоено ${A.mastery(t, s)}%</span></div>
        <nav class="lp-tabs">${tabs}</nav>
      </div>
      <div id="stage"></div>
    </section>
    <aside class="lp-tools">
      ${lesson.cheatsheet ? `<button class="lp-tool glass" type="button" id="cheat-open">${icon("book")}<span>Шпаргалка</span></button>` : ""}
      ${terms.length ? `<button class="lp-tool glass" type="button" id="dict-open">${icon("search")}<span>Словарик</span></button>` : ""}
      ${terms.length ? `<a class="lp-tool glass" href="#" data-go="cards">${icon("cards")}<span>Карточки</span>${due ? `<em>${due}</em>` : ""}</a>` : ""}
    </aside>
  </div>
  <button class="lp-show glass" type="button" data-nav="show">${icon("list")} Содержание</button>
  <div class="lp-scrim"></div>
  <div class="lp-bar glass">
    <button class="lp-ib lp-ink" type="button" data-nav="sheet" aria-label="Содержание">${icon("list")}</button>
    <div class="lp-bar-mid"><b>${barLabel}</b><span class="lp-bar-dots">${barDots}</span></div>
    ${lesson.cheatsheet ? `<button class="lp-ib" type="button" id="cheat-open-m" aria-label="Шпаргалка">${icon("book")}</button>` : ""}
    ${terms.length ? `<button class="lp-ib" type="button" id="dict-open-m" aria-label="Словарик">${icon("search")}</button>` : ""}
  </div>
  ${lesson.cheatsheet ? `<aside class="cheat lp-panel" id="cheat" aria-label="Шпаргалка">
    <div class="spread" style="margin-bottom:10px"><h2 style="margin:0">${icon("book")} Шпаргалка</h2>
      <button class="lp-ib" type="button" data-close aria-label="Закрыть">${icon("x")}</button></div>
    <div class="cheat-body">${lesson.cheatsheet}</div></aside>` : ""}
  ${terms.length ? `<aside class="cheat lp-panel" id="dict" aria-label="Словарик">
    <div class="spread" style="margin-bottom:10px"><h2 style="margin:0">${icon("search")} Словарик</h2>
      <button class="lp-ib" type="button" data-close aria-label="Закрыть">${icon("x")}</button></div>
    <input type="text" id="dict-q" placeholder="Найти термин во всём курсе" style="width:100%">
    <div id="dict-list" class="lp-dict"></div></aside>` : ""}
  <div class="lp-tip glass hidden" id="lp-tip" role="tooltip"></div>`;
}

function bindFrame() {
  $$("[data-go]").forEach(a => a.addEventListener("click", e => {
    e.preventDefault();
    const [stage, i] = a.dataset.go.split(":");
    go(stage, Number(i || 0));
  }));
  const open = id => { closeOverlays(); $$(".lp-panel").forEach(x => x.classList.toggle("open", x.id === id)); };
  for (const [btn, id] of [["#cheat-open", "cheat"], ["#cheat-open-m", "cheat"], ["#dict-open", "dict"], ["#dict-open-m", "dict"]]) {
    const b = $(btn); if (b) b.onclick = () => open(id);
  }
  $$(".lp-panel [data-close]").forEach(b => { b.onclick = () => b.closest(".lp-panel").classList.remove("open"); });
  const q = $("#dict-q");
  if (q) {
    const draw = () => {
      const list = q.value.trim() ? G.search(glossary, q.value).slice(0, 30) : terms;
      $("#dict-list").innerHTML = list.map(e => `<div class="lp-dict-item"><b>${esc(e.term)}</b>${e.topic !== num ? `<span class="small muted"> · тема ${e.topic}</span>` : ""}<div>${esc(e.def)}</div></div>`).join("")
        || `<p class="muted">Ничего не нашлось</p>`;
    };
    q.oninput = draw; draw();
  }
}
document.addEventListener("keydown", e => { if (e.key === "Escape") { $$(".lp-panel").forEach(x => x.classList.remove("open")); hideTip(); } });

// ---------- цель дня ----------
function updateGoal() {
  const g = D.progressToday(p);
  $$(".lp-ring").forEach(r => {
    r.style.setProperty("--pct", g.pct);
    r.classList.toggle("done", g.done);
    r.querySelector("b").textContent = r.classList.contains("small") ? g.minutes : `${g.minutes}/${g.goal}`;
  });
  $$(".lp-goal-text").forEach(x => { x.innerHTML = g.done ? "выполнена — так держать" : `ещё ${g.goal - g.minutes} мин · <a href="#" data-goal>изменить</a>`; });
  $$("[data-goal]").forEach(a => {
    a.onclick = e => {
      e.preventDefault();
      const i = D.GOALS.indexOf(D.goal(p));
      p.goal = D.GOALS[(i + 1) % D.GOALS.length];
      commit(); updateGoal();
    };
  });
}

// ---------- подсказки словарика ----------
function hideTip() { $("#lp-tip")?.classList.add("hidden"); }
document.addEventListener("click", e => {
  const term = e.target.closest(".term");
  const tip = $("#lp-tip");
  if (!tip) return;
  if (!term) { if (!e.target.closest("#lp-tip")) hideTip(); return; }
  const entry = glossary.find(x => x.term === term.dataset.term);
  if (!entry) return;
  tip.innerHTML = `<b>${esc(entry.term)}</b> — ${esc(entry.def)}<div class="small muted" style="margin-top:6px">${icon("cards")} есть во флеш-карточках темы</div>`;
  tip.classList.remove("hidden");
  const r = term.getBoundingClientRect(), w = Math.min(280, innerWidth - 24);
  tip.style.width = w + "px";
  tip.style.left = Math.max(12, Math.min(innerWidth - w - 12, r.left + r.width / 2 - w / 2)) + "px";
  const below = r.bottom + 10 + tip.offsetHeight < innerHeight;
  tip.style.top = (below ? r.bottom + 10 : r.top - tip.offsetHeight - 10) + "px";
});
addEventListener("scroll", hideTip, { passive: true });

/** Вставляет HTML с <script> внутри и запускает эти скрипты (innerHTML сам их не запускает). */
function injectHtml(el, html) {
  el.innerHTML = html;
  fillIcons(el);
  el.querySelectorAll("script").forEach(old => {
    const sc = document.createElement("script");
    sc.textContent = `(function () {\n${old.textContent}\n})();`;   // своя «комната» для переменных
    old.replaceWith(sc);
  });
}

// ---------- шаг урока ----------
function renderStep(el, s, index) {
  const step = lesson.steps[index];
  const les = lesson.lessons[step.lesson];
  const last = index + 1 >= lesson.steps.length;
  const lessonEnd = step.lessonStep + 1 >= les.steps.length;
  const q = step.question;
  const locked = q && !s.doneSteps.has(index);
  if (session.lesson !== step.lesson) session = { lesson: step.lesson, start: Date.now(), firstTry: 0, answered: 0 };
  let wrongHere = false;

  el.innerHTML = `<article class="lp-card glass" id="lp-card">
    <div class="lp-kicker"><span class="lp-pill" style="--lc: var(--c${(step.lesson % 6) + 1})">Урок ${step.lesson + 1} из ${lesson.lessons.length} · шаг ${step.lessonStep + 1} из ${les.steps.length}</span>
      <span class="small muted">${icon("clock")} урок ~${lessonMinutes[step.lesson]} мин</span></div>
    <div class="lp-progress"><i style="width:${Math.round(100 * (step.lessonStep + 1) / les.steps.length)}%"></i></div>
    <div class="small muted">${esc(les.title)}</div>
    <h1 class="lp-title">${esc(step.title)}</h1>
    <div class="step-body">${step.body}</div>
    ${step.widget ? `<div class="illu" id="widget"></div>` : step.svg ? `<div class="illu">${step.svg}</div>` : ""}
    ${step.after ? `<div class="step-body">${step.after}</div>` : ""}
    ${q ? `<div class="qbox lp-q" id="qbox"></div>` : ""}
    <div class="lp-foot">
      ${index > 0 ? `<button class="btn" type="button" id="prev-btn">${icon("arrow-left")} Назад</button>` : "<span></span>"}
      <span class="small muted lp-keys">${icon("keyboard")} стрелки или свайп</span>
      <button class="btn primary" type="button" id="next-btn" ${locked ? "disabled" : ""} title="${locked ? "Сначала ответь на вопрос" : ""}">
        ${last ? "К практике" : lessonEnd ? "Завершить урок" : "Дальше"} ${icon("arrow-right")}</button>
    </div>
  </article>`;
  $$("#lp-card .step-body").forEach(b => G.annotate(b, terms));
  if (step.widget) {
    fetch(`illustrations/${step.widget}.html`, { cache: "no-cache" }).then(r => r.text()).then(h => injectHtml($("#widget"), h));
  }
  if (q) {
    renderStepQuestion($("#qbox"), q, () => {
      if (!wrongHere) session.firstTry++;
      session.answered++;
      const next = $("#next-btn");
      next.disabled = false; next.title = ""; next.focus({ preventScroll: true });
    }, () => { wrongHere = true; });
  }
  $("#prev-btn")?.addEventListener("click", () => go("step", index - 1));
  $("#next-btn").addEventListener("click", () => {
    A.recordStep(p, num, index);
    commit();
    const nextStage = () => last ? go(t.trainer ? "trainer" : t.generator ? "tasks" : "test") : go("step", index + 1);
    if (lessonEnd) celebrate(les, step.lesson, last, nextStage);
    else nextStage();
  });
}

// ---------- праздник в конце урока ----------
function celebrate(les, li, last, onNext) {
  const sec = (Date.now() - session.start) / 1000;
  const g = D.progressToday(p);
  const stars = ["--c1", "--c5", "--c3", "--c2", "--c6", "--c4", "--c1", "--c5"]
    .map((c, i) => `<span class="lp-star" style="--c: var(${c}); --i:${i}">${icon("star")}</span>`).join("");
  const box = document.createElement("div");
  box.className = "lp-party";
  box.innerHTML = `<div class="lp-party-card glass" role="dialog" aria-label="Урок пройден">
    <div class="lp-stars">${stars}</div>
    <h2>Урок пройден!</h2><div class="muted">${esc(les.title)}</div>
    <div class="lp-party-stats">
      <div><b>${D.clockText(sec)}</b><span class="small muted">минут</span></div>
      <div><b>${les.steps.length}</b><span class="small muted">шагов</span></div>
      <div><b>${session.firstTry}/${session.answered || les.steps.length}</b><span class="small muted">с первой попытки</span></div>
    </div>
    <div class="lp-goal" style="justify-content:center"><div class="lp-ring ${g.done ? "done" : ""}" style="--pct:${g.pct}"><b>${g.minutes}/${g.goal}</b></div>
      <div style="text-align:left"><b>${g.done ? "Цель дня выполнена" : "Цель дня"}</b><div class="small muted">${g.done ? "отличная работа" : `осталось ${g.goal - g.minutes} мин`}</div></div></div>
    <div class="row" style="justify-content:center;gap:10px;margin-top:16px">
      <button class="btn" type="button" data-stay>Остаться</button>
      <button class="btn primary" type="button" data-next>${last ? "К практике" : `Урок ${li + 2}`} ${icon("arrow-right")}</button>
    </div></div>`;
  document.body.appendChild(box);
  const close = () => box.remove();
  box.querySelector("[data-stay]").onclick = close;
  box.querySelector("[data-next]").onclick = () => { close(); onNext(); };
  box.addEventListener("click", e => { if (e.target === box) close(); });
  box.querySelector("[data-next]").focus();
}

// ---------- клавиши и свайпы между шагами ----------
const typing = el => el.closest("input, textarea, select, [contenteditable]");
document.addEventListener("keydown", e => {
  if (current.stage !== "step" || typing(e.target) || e.altKey || e.ctrlKey || e.metaKey || document.querySelector(".lp-party")) return;
  if (e.key === "ArrowRight") { const b = $("#next-btn"); if (b && !b.disabled) { e.preventDefault(); b.click(); } }
  if (e.key === "ArrowLeft") { const b = $("#prev-btn"); if (b) { e.preventDefault(); b.click(); } }
});
let swipe = null;
document.addEventListener("touchstart", e => {
  if (current.stage !== "step" || e.touches.length !== 1) return;
  const el = e.target;
  if (!el.closest("#lp-card") || el.closest(".illu, .qbox, input, textarea, [data-noswipe]")) return;
  swipe = { x: e.touches[0].clientX, y: e.touches[0].clientY };
}, { passive: true });
document.addEventListener("touchend", e => {
  if (!swipe) return;
  const dx = e.changedTouches[0].clientX - swipe.x, dy = e.changedTouches[0].clientY - swipe.y;
  swipe = null;
  if (Math.abs(dx) < 60 || Math.abs(dy) > 40) return;
  const b = dx < 0 ? $("#next-btn") : $("#prev-btn");
  if (b && !b.disabled) b.click();
}, { passive: true });

// ---------- флеш-карточки ----------
function renderCards(el) {
  let list = FC.due(p, terms), i = 0, flipped = false;
  function draw() {
    const sum = FC.summary(p, terms);
    const head = `<div class="lp-kicker"><span class="lp-pill" style="--lc: var(--c5)">Карточки темы</span>
      <span class="small muted">выучено ${sum.learned} из ${sum.total} · на сегодня ${sum.due}</span></div>`;
    if (i >= list.length) {
      el.innerHTML = `<article class="lp-card glass">${head}
        <h1 class="lp-title">На сегодня всё</h1>
        <p class="muted">Карточки, которые ты знаешь, вернутся через 1, 3, 7 и 14 дней — так слова переходят в долгую память.</p>
        <div class="lp-cards-grid">${terms.map(e => { const st = FC.state(p, e.term); return `<div class="lp-mini glass" style="--b:${st.b}"><b>${esc(e.term)}</b><span class="small muted">${st.d ? `коробка ${st.b} · до ${st.d.slice(8, 10)}.${st.d.slice(5, 7)}` : "новая"}</span></div>`; }).join("")}</div>
        <button class="btn primary" type="button" id="cards-all" style="margin-top:14px">${icon("refresh")} Пройти все ещё раз</button>
      </article>`;
      $("#cards-all").onclick = () => { list = [...terms].sort(() => Math.random() - 0.5); i = 0; flipped = false; draw(); };
      fillIcons(el);
      return;
    }
    const e = list[i];
    el.innerHTML = `<article class="lp-card glass">${head}
      <div class="lp-flash ${flipped ? "flip" : ""}" id="flash" tabindex="0" role="button" aria-label="Перевернуть карточку">
        <div class="lp-face lp-front"><span class="small muted">карточка ${i + 1} из ${list.length}</span><b>${esc(e.term)}</b><span class="small muted">нажми, чтобы перевернуть</span></div>
        <div class="lp-face lp-back"><b>${esc(e.term)}</b><p>${esc(e.def)}</p></div>
      </div>
      <div class="lp-foot">
        <button class="btn" type="button" id="card-again">${icon("refresh")} Повторить</button>
        <span class="small muted lp-keys">пробел — перевернуть</span>
        <button class="btn primary" type="button" id="card-know">${icon("check")} Знаю</button>
      </div></article>`;
    const flip = () => { flipped = !flipped; $("#flash").classList.toggle("flip", flipped); };
    $("#flash").onclick = flip;
    $("#flash").onkeydown = ev => { if (ev.key === " " || ev.key === "Enter") { ev.preventDefault(); flip(); } };
    const answer = knew => { FC.grade(p, e.term, knew); commit(); if (!knew) list.push(e); i++; flipped = false; draw(); };
    $("#card-know").onclick = () => answer(true);
    $("#card-again").onclick = () => answer(false);
    fillIcons(el);
    $("#flash").focus({ preventScroll: true });
  }
  if (!terms.length) { el.innerHTML = `<article class="lp-card glass"><p class="muted">Для этой темы карточек пока нет.</p></article>`; return; }
  draw();
}

// ---------- тренажёр ----------
function renderTrainer(el, s) {
  el.innerHTML = `<div class="card">
    <div class="spread">
      <h1 class="step-title" style="margin:0">${icon("flask")} Тренажёр</h1>
      <span class="badge ac ${s.trainerDone ? "" : "hidden"}" id="trainer-badge">${icon("check")} задание выполнено</span>
    </div>
    <div id="trainer" style="margin-top:12px"><p class="muted">Загружаю тренажёр…</p></div>
    <div class="spread" style="margin-top:16px">
      <button class="btn" type="button" id="to-lesson">${icon("arrow-left")} К уроку</button>
      <button class="btn primary" type="button" id="to-next">${t.generator ? "К задачам" : "К тесту"} ${icon("arrow-right")}</button>
    </div>
  </div>`;
  fetch(`trainers/${t.trainer}.html`, { cache: "no-cache" }).then(r => r.text()).then(h => injectHtml($("#trainer"), h));
  $("#to-lesson").onclick = () => go("step", lesson.steps.length - 1);
  $("#to-next").onclick = () => go(t.generator ? "tasks" : "test");
}

// ---------- бесконечные задачи ----------
function renderTasks(el, s) {
  el.innerHTML = `<div class="card">
    <div class="spread">
      <h1 class="step-title" style="margin:0">${icon("pencil")} Задачи</h1>
      <span class="small muted">Уровень: <span id="lvl-boxes" class="mono" style="color:var(--acs)"></span> <span id="lvl-name"></span>
        · серия <span id="streak">0</span> ${icon("flame")} · решено: <span id="solved">${s.tasksCount}</span></span>
    </div>
    <div id="level-note" class="feedback ok hidden" style="margin-top:10px"></div>
    <div class="card" style="background:var(--card-2);margin-top:12px">
      <div id="task-text" style="font-size:1.05rem"></div>
      <form id="task-form" class="row" style="margin-top:12px" autocomplete="off">
        <span id="task-input-wrap" class="row"></span>
        <button class="btn primary" type="submit" id="check-btn">Проверить</button>
        <span class="small muted" id="attempt-note"></span>
      </form>
      <div class="error-text hidden" id="task-error"></div>
    </div>
    <div class="feedback hidden" id="task-feedback"><div class="fh"></div><div class="fb"></div><div class="solution"></div></div>
    <div class="spread" style="margin-top:14px">
      <button class="btn hidden" type="button" id="next-task">${icon("dice")} Следующая задача</button>
      <span></span>
      <button class="btn ${s.tasksCount >= 5 ? "primary" : ""}" type="button" id="to-test">К тесту ${icon("arrow-right")}</button>
    </div>
    <p class="small muted" style="margin-top:10px">Задачи бесконечные и каждый раз новые. Три верных ответа подряд — уровень сложности растёт.</p>
  </div>`;
  $("#to-test").onclick = () => go("test");

  const text = $("#task-text"), form = $("#task-form"), wrap = $("#task-input-wrap");
  const fb = $("#task-feedback"), err = $("#task-error"), nextBtn = $("#next-task"), checkBtn = $("#check-btn"), note = $("#attempt-note");
  let task, attempts, firstError, choice, finished;

  function setLevel(level, streak) {
    $("#lvl-boxes").textContent = "■".repeat(level) + "□".repeat(3 - level);
    $("#lvl-name").textContent = A.LEVEL_NAMES[level];
    $("#streak").textContent = streak;
  }
  function showFeedback(cls, head, body, steps) {
    fb.className = "feedback " + cls;
    fb.querySelector(".fh").textContent = head;
    fb.querySelector(".fb").innerHTML = body || "";
    fb.querySelector(".solution").innerHTML = steps
      ? `<div class="small muted" style="margin-top:6px">Решение:</div><ol>${steps.map(x => `<li>${x}</li>`).join("")}</ol>` : "";
  }

  function newTask() {
    const st = p.topics[num] || { level: 1, ok: 0 };
    task = make(t.generator, st.level);
    attempts = 0; firstError = null; choice = null; finished = false;
    fb.className = "feedback hidden"; err.classList.add("hidden"); nextBtn.classList.add("hidden");
    $("#level-note").classList.add("hidden");
    checkBtn.disabled = false; note.textContent = "";
    text.innerHTML = task.text;
    setLevel(st.level, st.ok);
    wrap.innerHTML = "";
    if (task.kind === "choice") {
      for (const o of task.options) {
        const b = document.createElement("button");
        b.type = "button"; b.className = "choice"; b.innerHTML = o;
        b.addEventListener("click", () => {
          if (finished) return;
          $$(".choice", wrap).forEach(x => x.classList.remove("picked"));
          b.classList.add("picked"); choice = o; err.classList.add("hidden");
        });
        wrap.appendChild(b);
      }
    } else {
      const inp = document.createElement("input");
      inp.type = "text"; inp.id = "answer"; inp.inputMode = task.kind === "number" ? "decimal" : "text";
      inp.placeholder = task.placeholder || "Ответ";
      inp.style.width = task.kind === "number" ? "160px" : "min(420px, 70vw)";
      inp.addEventListener("input", () => { err.classList.add("hidden"); inp.classList.remove("bad"); });
      wrap.appendChild(inp);
      if (task.unit) wrap.insertAdjacentHTML("beforeend", `<span class="muted">${esc(task.unit)}</span>`);
      inp.focus();
    }
  }

  function finish(firstTry, errorType, solved) {
    finished = true; checkBtn.disabled = true;
    const state = A.recordTask(p, num, firstTry, errorType, "task", solved);
    commit();
    $("#solved").textContent = Number($("#solved").textContent) + 1;
    setLevel(state.level, state.streak);
    if (state.changed) {
      const ln = $("#level-note");
      ln.className = "feedback " + (state.changed > 0 ? "ok" : "warn");
      ln.textContent = state.changed > 0 ? `Уровень повышен: ${A.LEVEL_NAMES[state.level]}! Задачи станут интереснее.`
        : `Уровень снижен до «${A.LEVEL_NAMES[state.level]}» — потренируемся на задачах попроще.`;
    }
    nextBtn.classList.remove("hidden"); nextBtn.focus();
  }

  form.addEventListener("submit", e => {
    e.preventDefault();
    if (finished) return;
    const inp = $("#answer");
    const answer = task.kind === "choice" ? choice : inp.value;
    if (answer === null || String(answer).trim() === "") {
      err.textContent = task.kind === "choice" ? "Сначала выбери вариант" : "Сначала введи ответ";
      err.classList.remove("hidden");
      if (inp) { inp.classList.add("bad"); inp.focus(); }
      return;
    }
    const res = checker.check(task, answer);
    if (res.invalid) { err.textContent = res.message; err.classList.remove("hidden"); inp?.classList.add("bad"); return; }
    attempts++;
    if (res.correct) {
      showFeedback("ok", attempts === 1 ? "Верно! Отлично!" : "Верно! Со второй попытки — тоже здорово.", "", task.solution);
      finish(attempts === 1, firstError, true);
      return;
    }
    if (attempts === 1) {
      firstError = res.errorType;
      const diagnosed = res.errorType !== null;
      const msg = checker.feedbackHint(task, res.errorType);
      showFeedback("warn", diagnosed ? "Почти! " + msg : "Не совсем.", diagnosed ? "Попробуй ещё раз." : msg + " Попробуй ещё раз.");
      note.textContent = "попытка 2 из 2";
      if (inp) { inp.select(); inp.focus(); }
      return;
    }
    const diagnosis = res.errorType ? checker.feedbackHint(task, res.errorType) : null;
    showFeedback("bad", "Правильный ответ: " + checker.displayAnswer(task), diagnosis || "Разберём решение по шагам:", task.solution);
    finish(false, firstError || res.errorType, false);
  });
  nextBtn.addEventListener("click", newTask);
  newTask();
}

// ---------- тест ----------
function renderTest(el, s) {
  const questions = quiz.build(t, lesson);
  if (!questions.length) {
    el.innerHTML = `<div class="card"><h1 class="step-title">${icon("list-check")} Тест по теме</h1><p class="muted">Вопросы для этой темы скоро появятся.</p></div>`;
    return;
  }
  el.innerHTML = `<div class="card">
    <h1 class="step-title">${icon("list-check")} Тест по теме</h1>
    <p class="muted">${questions.length} вопросов. Для зачёта нужно ответить верно хотя бы на ${A.PASS}%.
      ${s.bestTest !== null ? `Твой лучший результат: ${s.bestTest}%.` : ""}</p>
    <form id="test-form" autocomplete="off" novalidate>
      ${renderQuestions(questions)}
      <div class="error-text hidden" id="test-error">Ответь на все вопросы, чтобы завершить тест</div>
      <button class="btn primary" type="submit" style="margin-top:6px">Завершить тест ${icon("check")}</button>
    </form>
  </div>`;
  bindQuestionForm($("#test-form"), () => {
    const { score, results } = quiz.grade(questions, collectAnswers($("#test-form")));
    // ошибки в тесте тоже идут в статистику «частых ошибок»
    for (const r of results) if (r.errorType) A.recordTestError(p, num, r.errorType);
    const info = A.recordTest(p, num, score, questions.length);
    commit();
    $("#stage").innerHTML = renderResult({ t, score, total: questions.length, results, info, review: false });   // рамка с оглавлением остаётся
    fillIcons();
    $("#retest")?.addEventListener("click", () => go("test"));
    window.scrollTo({ top: 0 });
  });
}

show(param("stage"), Number(param("i") || 0));
