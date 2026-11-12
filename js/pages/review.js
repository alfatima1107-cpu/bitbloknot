// Повторение темы: разминка из трёх задач (интервалы 1, 3 и 7 дней).
import * as A from "../adaptive.js";
import { lesson as loadLesson } from "../course.js";
import * as quiz from "../quiz.js";
import { studentPage } from "../student-page.js";
import { $, esc, fillIcons, icon, param } from "../ui.js";
import { bindQuestionForm, collectAnswers, renderQuestions, renderResult } from "../render/questions.js";

const { p, course, commit } = await studentPage();
const num = Number(param("n"));
const t = course.topics.find(x => x.num === num);
if (!t) { location.replace("home.html"); throw new Error("no topic"); }
const lesson = await loadLesson(num);
document.title = `Разминка · ${t.title}`;

const questions = quiz.build(t, lesson, 3);
$("#main").innerHTML = `<a href="home.html" class="muted">${icon("arrow-left")} На главную</a>
  <div class="card" style="margin-top:12px">
    <h1 class="step-title">${icon("refresh")} Разминка: ${esc(t.title)}</h1>
    <p class="muted">Три задачи, чтобы тема не забылась. Ответь верно хотя бы на две — и следующее повторение будет позже.</p>
    <form id="test-form" autocomplete="off" novalidate>
      ${renderQuestions(questions)}
      <div class="error-text hidden" id="test-error">Ответь на все вопросы</div>
      <button class="btn primary" type="submit">Проверить ${icon("check")}</button>
    </form>
  </div>`;

bindQuestionForm($("#test-form"), () => {
  const { score, results } = quiz.grade(questions, collectAnswers($("#test-form")));
  for (const r of results) A.recordTask(p, num, r.correct, r.errorType, "review", r.correct);
  const info = A.recordReview(p, num, score, questions.length);
  commit();
  $("#main").innerHTML = renderResult({ t, score, total: questions.length, results, info, review: true });
  fillIcons();
  window.scrollTo({ top: 0 });
});
