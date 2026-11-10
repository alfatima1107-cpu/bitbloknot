"""Проверяем содержание всех 12 уроков: структура, ответы в вопросах, банки тестов."""
import random

import pytest

from tutor import checker, course, quiz

NUMS = [t["num"] for t in course.topics()]


@pytest.mark.parametrize("num", NUMS)
def test_lesson_structure(num):
    lesson = course.lesson(num)
    assert 5 <= len(lesson["steps"]) <= 7, f"тема {num}: шагов {len(lesson['steps'])}"
    assert lesson["cheatsheet"].strip()
    for i, st in enumerate(lesson["steps"]):
        assert st["title"] and st["body"] and st.get("short"), (num, i)
        q = st.get("question")
        assert q, f"тема {num}, шаг {i + 1}: нет мини-вопроса"
        assert 0 <= q["answer"] < len(q["options"]), (num, i)
        assert len(set(q["options"])) == len(q["options"]), (num, i)
        assert q.get("explain"), (num, i)


@pytest.mark.parametrize("num", NUMS)
def test_test_bank(num):
    bank = course.lesson(num)["test_bank"]
    assert len(bank) >= 20, f"тема {num}: в банке {len(bank)} вопросов"
    rng = random.Random(1)
    for e in bank:
        q = quiz._from_bank(e, rng)
        assert checker.check(q, str(q["answer"]))["correct"], (num, e["q"])
        if q["kind"] == "choice":
            assert 0 <= e["answer"] < len(e["options"])
            assert len(set(e["options"])) == len(e["options"]), (num, e["q"])
        for trap, et in q.get("traps", {}).items():
            res = checker.check(q, trap)
            assert not res["correct"] and res["error_type"] == et, (num, e["q"], trap)


@pytest.mark.parametrize("num", NUMS)
def test_build_test(num):
    qs = quiz.build(num, rng=random.Random(num))
    assert len(qs) == quiz.TEST_SIZE
    assert len({q["text"] for q in qs}) >= 8      # почти без повторов


def test_widgets_exist():
    from pathlib import Path
    base = Path(__file__).resolve().parent.parent / "templates"
    for num in NUMS:
        for st in course.lesson(num)["steps"]:
            if st.get("widget"):
                assert (base / "illustrations" / f"{st['widget']}.html").exists()
    for t in course.topics():
        if t.get("trainer"):
            assert (base / "trainers" / f"{t['trainer']}.html").exists(), t["trainer"]
