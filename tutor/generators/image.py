"""Тема 8. Кодирование изображений: N = 2ⁱ (палитра и глубина цвета), I = ширина × высота × i."""
import math


def depth(n_colors: int) -> int:
    return max(1, math.ceil(math.log2(n_colors)))


def generate(level, rng):
    from . import fmt
    kind = rng.choice({1: ["depth", "volume_small"],
                       2: ["depth_odd", "volume_bytes"],
                       3: ["volume_kb", "colors_from_volume", "palette_change"]}[level])

    if kind == "depth":
        i = rng.choice([1, 2, 3, 4, 5, 6, 8])
        n = 2 ** i
        return {
            "text": f"В палитре <b>{n}</b> цветов. Какова глубина цвета (сколько бит на один пиксель)?",
            "answer": i, "unit": "бит",
            "hint": "Глубина цвета i связана с числом цветов N формулой N = 2ⁱ.",
            "solution": [f"N = {n} = 2^{i}", f"Глубина цвета i = {i} бит"],
            "traps": {str(n // 2): "n_vs_i", str(n): "n_vs_i"},
        }
    if kind == "volume_small":
        w, h = rng.choice([4, 5, 8, 10, 16]), rng.choice([4, 5, 8, 10, 16])
        n = rng.choice([2, 4])
        i = depth(n)
        v = w * h * i
        return {
            "text": f"Рисунок размером <b>{w} × {h}</b> пикселей использует палитру из <b>{n}</b> цветов. "
                    f"Каков объём рисунка в <b>битах</b>?",
            "answer": v, "unit": "бит",
            "hint": "Объём = количество пикселей × глубина цвета. Сначала найди глубину цвета из N = 2ⁱ.",
            "solution": [f"Пикселей: {w} × {h} = {w * h}", f"{n} цвета → i = {i} бит",
                         f"I = {w * h} × {i} = {v} бит"],
            "traps": {str(w * h): "n_vs_i", str(w * h * n): "n_vs_i", str((w + h) * i): "pixels"},
        }
    if kind == "depth_odd":
        n = rng.choice([3, 5, 6, 7, 10, 12, 20, 25, 50, 100, 200])
        i = depth(n)
        return {
            "text": f"Художник использует палитру из <b>{n}</b> цветов. Сколько бит нужно на один пиксель?",
            "answer": i, "unit": "бит",
            "hint": "Подбери наименьшую степень двойки, которой хватит на все цвета.",
            "solution": [f"2^{i - 1} = {2 ** (i - 1)} < {n} — не хватает",
                         f"2^{i} = {2 ** i} ≥ {n} — хватает", f"i = {i} бит"],
            "traps": {str(i - 1): "no_ceil"},
        }
    if kind == "volume_bytes":
        w, h = rng.choice([8, 16, 20, 32, 40]), rng.choice([8, 16, 20, 32, 40])
        n = rng.choice([4, 5, 16, 20, 256])
        i = depth(n)
        bits = w * h * i
        v = bits // 8
        return {
            "text": f"Изображение <b>{w} × {h}</b> пикселей, палитра из <b>{n}</b> цветов. "
                    f"Каков объём изображения в <b>байтах</b>?",
            "answer": v, "unit": "байт",
            "hint": "Пиксели × глубина цвета дадут биты; переведи их в байты.",
            "solution": [f"Пикселей: {w} × {h} = {w * h}", f"{n} цветов → i = {i} бит",
                         f"I = {w * h} × {i} = {fmt(bits)} бит", f"{fmt(bits)} бит : 8 = {fmt(v)} байт"],
            "traps": {str(bits): "bits_bytes", str(w * h * (i - 1) / 8): "no_ceil", str(w * h * n / 8): "n_vs_i"},
        }
    if kind == "volume_kb":
        while True:
            w, h = rng.choice([32, 64, 128, 256, 512]), rng.choice([32, 64, 128, 256])
            n = rng.choice([2, 4, 16, 256, 65536])
            i = depth(n)
            bits = w * h * i
            if bits % 8192 == 0 and bits // 8192 <= 1024:
                break
        kb = bits // 8192
        return {
            "text": f"Растровое изображение <b>{w} × {h}</b> пикселей, палитра <b>{fmt(n)}</b> цветов. "
                    f"Сколько <b>Кбайт</b> займёт изображение?",
            "answer": kb, "unit": "Кбайт",
            "hint": "Пиксели × глубина цвета → биты → байты (: 8) → Кбайты (: 1024).",
            "solution": [f"Пикселей: {w} × {h} = {fmt(w * h)}", f"{fmt(n)} цветов → i = {i} бит",
                         f"I = {fmt(w * h)} × {i} = {fmt(bits)} бит",
                         f"{fmt(bits)} : 8 = {fmt(bits // 8)} байт", f"{fmt(bits // 8)} : 1024 = {kb} Кбайт"],
            "traps": {str(bits // 8): "one_step", str(kb * 8): "bits_bytes", str(bits / 8 / 1000): "kilo_1000"},
        }
    if kind == "colors_from_volume":
        while True:
            w, h = rng.choice([32, 64, 128]), rng.choice([32, 64, 128])
            i = rng.choice([1, 2, 4, 8])
            bits = w * h * i
            if bits % 8192 == 0:
                break
        kb = bits // 8192
        n = 2 ** i
        return {
            "text": f"Рисунок <b>{w} × {h}</b> пикселей занимает <b>{kb} Кбайт</b> памяти. "
                    f"Какое максимальное число цветов может быть в палитре?",
            "answer": n, "unit": "цветов",
            "hint": "Переведи объём в биты, раздели на число пикселей — получишь i. Потом N = 2ⁱ.",
            "solution": [f"{kb} Кбайт = {kb} × 1024 × 8 = {fmt(bits)} бит",
                         f"Пикселей: {w} × {h} = {fmt(w * h)}", f"i = {fmt(bits)} : {fmt(w * h)} = {i} бит",
                         f"N = 2^{i} = {n} цветов"],
            "traps": {str(i): "n_vs_i"},
        }
    # palette_change
    i1, i2 = rng.choice([(8, 4), (8, 2), (16, 8), (4, 2), (8, 1), (16, 4), (24, 8)])
    n1, n2 = 2 ** i1, 2 ** i2
    ratio = i1 // i2
    return {
        "text": f"Палитру изображения уменьшили с <b>{fmt(n1)}</b> до <b>{fmt(n2)}</b> цветов. "
                f"Во сколько раз уменьшился объём изображения?",
        "answer": ratio, "unit": "раз(а)",
        "hint": "Объём зависит не от числа цветов, а от глубины цвета i. Сравни i до и после.",
        "solution": [f"{fmt(n1)} цветов → i = {i1} бит", f"{fmt(n2)} цветов → i = {i2} бит",
                     f"{i1} : {i2} = {ratio} — во столько раз уменьшился объём"],
        "traps": {str(n1 // n2): "n_vs_i"},
    }
