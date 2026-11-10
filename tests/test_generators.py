"""Проверяем генераторы задач: ответы правильные, ловушки распознаются, решение есть."""
import random

import pytest

from tutor import checker
from tutor.errors import ERRORS
from tutor.generators import REGISTRY, make
from tutor.generators.alphabet import bits_for
from tutor.generators.image import depth
from tutor.generators.units import convert

SEEDS = range(150)


@pytest.mark.parametrize("key", sorted(REGISTRY))
@pytest.mark.parametrize("level", [1, 2, 3])
def test_generator_is_consistent(key, level):
    for seed in SEEDS:
        t = make(key, level, random.Random(seed))
        assert t["text"] and t["solution"], (key, level, seed)
        # правильный ответ принимается
        assert checker.check(t, str(t["answer"]))["correct"], (key, level, seed, t)
        # каждая ловушка распознаётся как ошибка нужного типа
        for trap, et in t["traps"].items():
            assert et in ERRORS, et
            if checker.parse_number(trap) is None and t["kind"] == "number":
                continue
            res = checker.check(t, trap)
            assert not res["correct"], (key, level, seed, trap, t["answer"])
            assert res["error_type"] == et
        if t["kind"] == "number" and not t.get("tolerance"):
            assert float(t["answer"]).is_integer(), (key, level, seed, t["answer"])
        if t["kind"] == "choice":
            assert t["answer"] in t["options"]
            assert len(set(t["options"])) == len(t["options"])


def test_known_values():
    assert convert(3, "Кбайт", "бит") == 24576
    assert convert(2, "Мбайт", "Кбайт") == 2048
    assert convert(16384, "бит", "Кбайт") == 2
    assert bits_for(33) == 6
    assert bits_for(32) == 5
    assert bits_for(2) == 1
    assert depth(5) == 3
    assert depth(256) == 8


def test_units_trap_bits_bytes():
    # 3 Кбайт в битах: ответ 3072 — это байты, а не биты
    task = {"kind": "number", "answer": 24576, "traps": {"3072": "bits_bytes", "24000": "kilo_1000"}}
    assert checker.check(task, "3072")["error_type"] == "bits_bytes"
    assert checker.check(task, "24000")["error_type"] == "kilo_1000"
    assert checker.check(task, "24 576")["correct"]


def test_level_changes_difficulty():
    easy = [make("units", 1, random.Random(s))["unit"] for s in range(50)]
    hard = [make("units", 3, random.Random(s))["unit"] for s in range(50)]
    assert set(easy) <= {"бит", "байт"}
    assert set(hard) & {"Кбайт", "Мбайт"}
