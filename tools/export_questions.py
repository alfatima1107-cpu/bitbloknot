"""Собирает все вопросы и ответы курса в один файл docs/QUESTIONS.md — для проверки взрослым или учителем.

Запуск:  .venv\\Scripts\\python.exe tools\\export_questions.py
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from tutor import course  # noqa: E402

TAG = re.compile(r"<[^>]+>")


def plain(html: str) -> str:
    return " ".join(TAG.sub("", html).replace("&nbsp;", " ").split())


def main():
    out = ["# БитБлокнот — все вопросы и ответы", "",
           "Файл создан автоматически скриптом `tools/export_questions.py`. "
           "Правильный ответ отмечен ✅. Задачи из генераторов здесь не перечислены — "
           "их правильность проверяют автотесты (`tests/test_generators.py`).", ""]
    total = 0
    for t in course.topics():
        lesson = course.lesson(t["num"])
        out += [f"## Тема {t['num']}. {t['title']}", "", "### Мини-вопросы после шагов", ""]
        for i, st in enumerate(lesson["steps"], 1):
            q = st["question"]
            out.append(f"{i}. **{plain(q['text'])}** — ✅ {plain(q['options'][q['answer']])}")
            total += 1
        out += ["", "### Банк вопросов теста", ""]
        for i, e in enumerate(lesson["test_bank"], 1):
            if e.get("type") in ("number", "text"):
                ans = f"{e['answer']} {e.get('unit', '')}".strip()
            else:
                ans = plain(e["options"][e["answer"]])
            out.append(f"{i}. {plain(e['q'])} — ✅ **{ans}**")
            total += 1
        out.append("")
    out.insert(4, f"Всего вопросов: **{total}**.\n")
    (ROOT / "docs" / "QUESTIONS.md").write_text("\n".join(out), encoding="utf-8")
    print(f"Готово: {total} вопросов → docs/QUESTIONS.md")


if __name__ == "__main__":
    main()
