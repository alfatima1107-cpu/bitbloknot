"""Тема 6. Перевод единиц измерения информации.

Лестница: бит —×8→ байт —×1024→ Кбайт —×1024→ Мбайт —×1024→ Гбайт.
"""
UNITS = ["бит", "байт", "Кбайт", "Мбайт", "Гбайт"]
STEP = [None, 8, 1024, 1024, 1024]      # во сколько раз ступень больше предыдущей


def bits_in(unit: str, kilo: int = 1024) -> int:
    i = UNITS.index(unit)
    if i == 0:
        return 1
    return 8 * kilo ** (i - 1)


def convert(value, a, b, kilo=1024):
    return value * bits_in(a, kilo) / bits_in(b, kilo)


PAIRS = {
    1: [("байт", "бит"), ("бит", "байт")],
    2: [("Кбайт", "байт"), ("байт", "Кбайт"), ("Кбайт", "бит"), ("Мбайт", "Кбайт")],
    3: [("бит", "Кбайт"), ("Мбайт", "бит"), ("Кбайт", "Мбайт"), ("Гбайт", "Мбайт"), ("Мбайт", "байт")],
}


def ladder(value, a, b):
    """Пошаговый перевод по лестнице единиц."""
    from . import fmt
    ia, ib = UNITS.index(a), UNITS.index(b)
    steps, v = [], value
    if ia > ib:          # к более мелкой единице — умножаем
        for i in range(ia, ib, -1):
            nv = v * STEP[i]
            steps.append(f"{fmt(v)} {UNITS[i]} × {STEP[i]} = {fmt(nv)} {UNITS[i - 1]}")
            v = nv
    else:                # к более крупной — делим
        for i in range(ia + 1, ib + 1):
            nv = v / STEP[i]
            steps.append(f"{fmt(v)} {UNITS[i - 1]} : {STEP[i]} = {fmt(nv)} {UNITS[i]}")
            v = nv
    return steps


def generate(level, rng):
    from . import fmt
    a, b = rng.choice(PAIRS[level])
    ia, ib = UNITS.index(a), UNITS.index(b)
    if ia > ib:
        value = rng.choice([2, 3, 4, 5, 6, 8, 10, 12, 16]) if level < 3 else rng.choice([2, 3, 4, 5])
        answer = convert(value, a, b)
    else:
        answer = rng.choice([2, 3, 4, 5, 6, 8, 10, 16])
        value = convert(answer, b, a)
    value, answer = int(value), int(answer)

    traps = {}
    traps[convert(value, b, a)] = "wrong_direction"
    traps[convert(value, a, b, kilo=1000)] = "kilo_1000"
    traps[answer * 8] = "bits_bytes"
    traps[answer / 8] = "bits_bytes"
    if abs(ia - ib) >= 2:   # частичный перевод — только первая ступенька
        first = UNITS[ia - 1] if ia > ib else UNITS[ia + 1]
        traps[convert(value, a, first)] = "one_step"
        if "бит" in (a, b):  # «забыл» ступеньку бит↔байт
            other = "байт" if b == "бит" else b
            src = "байт" if a == "бит" else a
            traps[convert(value, src, other)] = "bits_bytes"

    return {
        "text": f"Сколько будет <b>{fmt(value)} {a}</b> в единицах «{b}»?",
        "answer": answer,
        "unit": b,
        "hint": "Найди на лестнице единиц, в какую сторону идти: к крупным единицам — делим, "
                "к мелким — умножаем. Между битом и байтом ступенька ×8, дальше ×1024.",
        "solution": ladder(value, a, b) + [f"Ответ: {fmt(answer)} {b}"],
        "traps": {str(k): v for k, v in traps.items()},
    }
