"""Сборка тестов и разминок: вопросы из банка темы + задачи из генератора."""
import random

from . import checker, course, errors
from .generators import make

TEST_SIZE = 10
GEN_IN_TEST = 3      # сколько задач из генератора попадает в тест (если он есть у темы)


def _from_bank(entry: dict, rng: random.Random) -> dict:
    if entry.get("type") in ("number", "text"):
        return {"kind": entry["type"], "text": entry["q"], "answer": entry["answer"],
                "unit": entry.get("unit", ""), "explain": entry.get("explain", ""),
                "traps": {str(k): v for k, v in entry.get("traps", {}).items()},
                "tolerance": entry.get("tolerance", 0)}
    options = list(entry["options"])
    right = options[entry["answer"]]
    rng.shuffle(options)
    return {"kind": "choice", "text": entry["q"], "options": options, "answer": right,
            "explain": entry.get("explain", ""),
            "traps": {options_text: et for options_text, et in entry.get("traps", {}).items()}}


def _from_generator(key: str, level: int, rng: random.Random) -> dict:
    t = make(key, level, rng)
    t["explain"] = " → ".join(t.get("solution", []))
    return t


def build(num: int, count: int = TEST_SIZE, rng: random.Random | None = None) -> list[dict]:
    rng = rng or random.Random()
    topic = course.topic(num)
    bank = course.lesson(num).get("test_bank", [])
    gen = topic.get("generator")
    n_gen = min(GEN_IN_TEST, count) if gen else 0
    if count <= 3 and gen:   # разминка: все задачи из генератора
        n_gen = count
    picked = rng.sample(bank, min(len(bank), count - n_gen))
    questions = [_from_bank(e, rng) for e in picked]
    levels = [1, 2, 3, 2, 3, 1, 2, 3, 1, 2]
    while len(questions) < count and gen:
        questions.append(_from_generator(gen, levels[len(questions) % len(levels)], rng))
    rng.shuffle(questions)
    for i, q in enumerate(questions):
        q["id"] = i
    return questions


def grade(questions: list[dict], answers: dict) -> tuple[int, list[dict]]:
    score, results = 0, []
    for q in questions:
        given = answers.get(str(q["id"]), "")
        res = checker.check(q, given)
        ok = res["correct"]
        score += ok
        results.append({
            "q": q, "given": given, "correct": ok,
            "error_type": res.get("error_type"),
            "diagnosis": errors.hint(res.get("error_type")),
            "right": checker.display_answer(q),
        })
    return score, results
