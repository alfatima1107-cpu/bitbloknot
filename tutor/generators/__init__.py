"""Генераторы задач.

Каждый генератор — функция generate(level, rng) -> dict «задача»:
  text      — условие (может содержать простую разметку HTML)
  kind      — 'number' (ответ числом), 'text' (ответ строкой) или 'choice' (выбор варианта)
  answer    — правильный ответ
  options   — варианты (только для 'choice')
  unit      — подпись после поля ввода («бит», «Кбайт» …)
  tolerance — допустимая погрешность (для задач «округли до целых»)
  hint      — общая подсказка, если ошибка не распознана
  solution  — пошаговое решение (список строк)
  traps     — ответы-ловушки: {ответ: тип ошибки}, см. tutor/errors.py
"""
import random

from . import alphabet, files, image, sound, text, units

REGISTRY = {
    "alphabet": alphabet.generate,
    "files": files.generate,
    "image": image.generate,
    "sound": sound.generate,
    "text": text.generate,
    "units": units.generate,
}


def make(key: str, level: int, rng: random.Random | None = None) -> dict:
    rng = rng or random.Random()
    task = REGISTRY[key](max(1, min(3, level)), rng)
    task.setdefault("kind", "number")
    task.setdefault("unit", "")
    task.setdefault("traps", {})
    task.setdefault("tolerance", 0)
    task["level"] = level
    task["generator"] = key
    # ловушки: одинаковые числа записываем одинаково (3072.0 → 3072), ловушка не может совпадать с ответом
    clean = {}
    for k, v in task["traps"].items():
        k = _canon(k) if task["kind"] == "number" else str(k)
        if (k is None or k in clean or _same(k, task["answer"], task["tolerance"])
                or _same(k, task.get("exact", task["answer"]), task["tolerance"])):
            continue
        clean[k] = v
    task["traps"] = clean
    return task


def _canon(x):
    try:
        f = float(x)
    except (TypeError, ValueError):
        return None
    if f <= 0:
        return None
    return str(int(f)) if f.is_integer() else repr(round(f, 6))


def _same(a, b, tol=0):
    try:
        return abs(float(a) - float(b)) <= max(tol, 1e-9)
    except (TypeError, ValueError):
        return str(a).casefold() == str(b).casefold()


def fmt(x) -> str:
    """Красивая запись числа: 24576 → «24 576», 2.5 → «2,5»."""
    if isinstance(x, float) and x.is_integer():
        x = int(x)
    if isinstance(x, int):
        return f"{x:,}".replace(",", " ")
    s = f"{x:.3f}".rstrip("0").rstrip(".")
    whole, _, frac = s.partition(".")
    whole = f"{int(whole):,}".replace(",", " ")
    return whole + ("," + frac if frac else "")
