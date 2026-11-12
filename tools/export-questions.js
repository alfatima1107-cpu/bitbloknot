// Собирает все вопросы и ответы курса в один файл docs/QUESTIONS.md — для проверки взрослым или учителем.
// Запуск:  node tools/export-questions.js
import { writeFileSync } from "node:fs";
import { loadCourse } from "../tests/helpers.js";
import * as SQ from "../js/step-question.js";

const plain = html => String(html).replace(/<[^>]+>/g, "").replaceAll("&nbsp;", " ").split(/\s+/).filter(Boolean).join(" ");

const { topics, lessons } = loadCourse();
const out = [];
let total = 0;
for (const t of topics) {
  const lesson = lessons[t.num];
  out.push(`## Тема ${t.num}. ${t.title}`, "");
  lesson.lessons.forEach((l, li) => {
    out.push(`### Урок ${li + 1}. ${l.title}`, "");
    l.steps.forEach((st, i) => {
      const q = st.question;
      out.push(`${i + 1}. **${plain(q.text)}** — ответ: ${plain(SQ.answerText(q))}`);
      total++;
    });
    out.push("");
  });
  out.push("", "### Банк вопросов теста", "");
  lesson.test_bank.forEach((e, i) => {
    const ans = e.type === "number" || e.type === "text" ? `${e.answer} ${e.unit || ""}`.trim() : plain(e.options[e.answer]);
    out.push(`${i + 1}. ${plain(e.q)} — ответ: **${ans}**`);
    total++;
  });
  out.push("");
}
const head = ["# БитБлокнот — все вопросы и ответы", "",
  "Файл создан автоматически скриптом `tools/export-questions.js`. " +
  "Задачи из генераторов здесь не перечислены — их правильность проверяют автотесты (`tests/generators.test.js`).", "",
  `Всего вопросов: **${total}**.`, ""];
writeFileSync(new URL("../docs/QUESTIONS.md", import.meta.url), [...head, ...out].join("\n"), "utf-8");
console.log(`Готово: ${total} вопросов → docs/QUESTIONS.md`);
