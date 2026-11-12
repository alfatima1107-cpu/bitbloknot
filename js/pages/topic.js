// Страница темы: шаги урока, тренажёр, бесконечные задачи и тест.
// Всё рисуется прямо на странице, без перезагрузки: адрес меняется (topic.html?n=8&stage=tasks),
// чтобы кнопка «Назад» в браузере и обновление страницы работали как обычно.
import * as A from "../adaptive.js";
import * as checker from "../checker.js";
import { lesson as loadLesson } from "../course.js";
import { make } from "../generators/index.js";
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
document.title = `${t.title} · БитБлокнот`;

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
const go = (stage, i = 0) => { show(stage, i); window.scrollTo({ top: 0 }); };

function show(stage, index = 0) {
  disposeAll();   // старые 3D-сцены освобождают видеопамять
  const s = stats();
  if (!stage) { const n = A.nextStage(t, s); stage = n.kind; index = n.index ?? 0; }
  if (stage === "step" && !lesson.steps.length) stage = "test";
  if (stage === "step") index = Math.max(0, Math.min(index, lesson.steps.length - 1));
  if (stage === "trainer" && !t.trainer) stage = "test";
  if (stage === "tasks" && !t.generator) stage = "test";
  if (!["step", "trainer", "tasks", "test"].includes(stage)) stage = "test";
  const url = `topic.html?n=${num}&stage=${stage}` + (stage === "step" ? `&i=${index}` : "");
  history.replaceState(null, "", url);

  $("#main").innerHTML = frame(s, stage, index);
  const body = $("#stage");
  if (stage === "step") renderStep(body, s, index);
  else if (stage === "trainer") renderTrainer(body, s);
  else if (stage === "tasks") renderTasks(body, s);
  else renderTest(body, s);
  bindFrame();
  fillIcons();
}

// ---------- рамка: путь по уроку слева и шпаргалка ----------
function frame(s, stage, index) {
  const pathLink = (cls, href, ic, text) => `<a class="${cls}" href="${href}" data-go="${href}">${icon(ic)} ${text}</a>`;
  // уроки темы; шаги показываем только у открытого урока
  const openLesson = stage === "step" ? lesson.steps[index].lesson : -1;
  let path = "";
  lesson.lessons.forEach((l, li) => {
    const doneN = l.steps.filter((_, k) => s.doneSteps.has(l.start + k)).length;
    const full = doneN === l.steps.length;
    const firstOpen = l.steps.findIndex((_, k) => !s.doneSteps.has(l.start + k));
    const target = l.start + (firstOpen < 0 ? 0 : firstOpen);
    path += `<a class="lesson-head ${li === openLesson ? "open" : ""} ${full ? "done" : ""}" href="#" data-go="step:${target}">
      ${icon(full ? "check" : li === openLesson ? "chevron-down" : "chevron-right")}
      <span><span class="small muted">Урок ${li + 1}</span><br>${esc(l.title)}</span>
      <span class="small muted lh-count">${doneN}/${l.steps.length}</span></a>`;
    if (li === openLesson) {
      path += `<div class="lesson-steps">` + l.steps.map((st, k) => {
        const i = l.start + k;
        const cls = i === index ? "now" : s.doneSteps.has(i) ? "done" : "";
        return pathLink(cls, `step:${i}`, cls === "done" ? "check" : cls === "now" ? "dot" : "circle", esc(st.short || st.title));
      }).join("") + `</div>`;
    }
  });
  path += "<hr>";
  if (t.trainer) {
    const cls = stage === "trainer" ? "now" : s.trainerDone ? "done" : "";
    path += pathLink(cls, "trainer", s.trainerDone && stage !== "trainer" ? "check" : "flask", "Тренажёр");
  }
  if (t.generator) {
    const cls = stage === "tasks" ? "now" : s.tasksCount >= 5 ? "done" : "";
    path += pathLink(cls, "tasks", s.tasksCount >= 5 && stage !== "tasks" ? "check" : "pencil", "Задачи");
  }
  const passed = s.bestTest !== null && s.bestTest >= A.PASS;
  path += pathLink(stage === "test" ? "now" : passed ? "done" : "", "test", passed && stage !== "test" ? "check" : "list-check",
    "Тест" + (s.bestTest !== null ? ` <span class="small muted">· ${s.bestTest}%</span>` : ""));

  return `<div class="spread" style="margin-bottom:14px">
      <a href="home.html" class="muted">${icon("arrow-left")} Тема ${t.num} · ${esc(t.title)}</a>
      <div class="row">
        <span class="small muted">освоено ${A.mastery(t, s)}%</span>
        ${lesson.cheatsheet ? `<button class="btn small" type="button" id="cheat-open">${icon("book")} Шпаргалка</button>` : ""}
      </div>
    </div>
    <div class="lesson">
      <nav class="path" aria-label="Путь по уроку">${path}</nav>
      <section id="stage"></section>
    </div>
    ${lesson.cheatsheet ? `<aside class="cheat" id="cheat" aria-label="Шпаргалка">
      <div class="spread" style="margin-bottom:10px">
        <h2 style="margin:0">${icon("book")} Шпаргалка</h2>
        <button class="btn small ghost" type="button" id="cheat-close" aria-label="Закрыть">${icon("x")}</button>
      </div>
      <div class="cheat-body">${lesson.cheatsheet}</div>
    </aside>` : ""}`;
}

function bindFrame() {
  $$("[data-go]").forEach(a => a.addEventListener("click", e => {
    e.preventDefault();
    const [stage, i] = a.dataset.go.split(":");
    go(stage, Number(i || 0));
  }));
  const cheat = $("#cheat");
  if (cheat) {
    $("#cheat-open").onclick = () => cheat.classList.add("open");
    $("#cheat-close").onclick = () => cheat.classList.remove("open");
  }
}
document.addEventListener("keydown", e => { if (e.key === "Escape") $("#cheat")?.classList.remove("open"); });

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
  el.innerHTML = `<div class="card">
    <div class="small muted">Урок ${step.lesson + 1} из ${lesson.lessons.length} · ${esc(les.title)} · шаг ${step.lessonStep + 1} из ${les.steps.length}</div>
    <div class="bar" style="margin:6px 0 10px"><i style="width:${Math.round(100 * (step.lessonStep + 1) / les.steps.length)}%"></i></div>
    <h1 class="step-title">${esc(step.title)}</h1>
    <div class="step-body">${step.body}</div>
    ${step.widget ? `<div class="illu" id="widget"></div>` : step.svg ? `<div class="illu">${step.svg}</div>` : ""}
    ${step.after ? `<div class="step-body">${step.after}</div>` : ""}
    ${q ? `<div class="card qbox" style="background:var(--card-2);margin-top:14px" id="qbox"></div>` : ""}
    <div class="spread" style="margin-top:16px">
      ${index > 0 ? `<button class="btn" type="button" id="prev-btn">${icon("arrow-left")} Назад</button>` : "<span></span>"}
      <button class="btn primary" type="button" id="next-btn" ${locked ? "disabled" : ""} title="${locked ? "Сначала ответь на вопрос" : ""}">
        ${last ? "К практике" : lessonEnd ? "Следующий урок" : "Дальше"} ${icon("arrow-right")}</button>
    </div>
  </div>`;
  if (step.widget) {
    fetch(`illustrations/${step.widget}.html`, { cache: "no-cache" }).then(r => r.text()).then(h => injectHtml($("#widget"), h));
  }
  if (q) {
    renderStepQuestion($("#qbox"), q, () => {
      const next = $("#next-btn");
      next.disabled = false; next.title = ""; next.focus();
    });
  }
  $("#prev-btn")?.addEventListener("click", () => go("step", index - 1));
  $("#next-btn").addEventListener("click", () => {
    A.recordStep(p, num, index);
    commit();
    if (!last) go("step", index + 1);
    else go(t.trainer ? "trainer" : t.generator ? "tasks" : "test");
  });
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
    $("#main").innerHTML = renderResult({ t, score, total: questions.length, results, info, review: false });
    fillIcons();
    $("#retest")?.addEventListener("click", () => go("test"));
    window.scrollTo({ top: 0 });
  });
}

show(param("stage"), Number(param("i") || 0));
