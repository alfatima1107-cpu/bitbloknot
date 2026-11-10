"""Тема 7. Кодирование текста: объём = количество символов × вес символа."""

PHRASES = [
    "Бит за битом.",
    "Привет, мир!",
    "Я люблю информатику!",
    "Кот спит на клавиатуре.",
    "Код 7 класса",
    "Байт — это 8 бит.",
    "Ура, каникулы!",
    "Мой компьютер думает.",
    "Пиксель, байт, файл.",
    "Учи Python!",
]
WORDS = ["бит", "байт", "файл", "код", "пиксель", "компьютер", "алгоритм", "процессор", "монитор", "клавиатура"]
ENCODINGS = [(8, "КОИ-8 (8 бит на символ)"), (16, "Unicode (16 бит на символ)")]


def generate(level, rng):
    from . import fmt
    if level == 1:
        w = rng.choice(WORDS)
        bits, name = rng.choice(ENCODINGS)
        n = len(w)
        v = n * bits
        return {
            "text": f"Слово «<b>{w}</b>» записано в кодировке {name}. Каков его объём в <b>битах</b>?",
            "answer": v, "unit": "бит",
            "hint": "Посчитай буквы в слове и умножь на вес одной буквы.",
            "solution": [f"В слове «{w}» {n} символов", f"{n} × {bits} = {v} бит"],
            "traps": {str(v // 8): "bits_bytes", str(n): "bits_bytes"},
        }
    if level == 2:
        p = rng.choice(PHRASES)
        bits, name = rng.choice(ENCODINGS)
        n = len(p)
        no_spaces = sum(ch.isalnum() for ch in p)
        v = n * bits // 8
        return {
            "text": f"Сколько <b>байт</b> займёт фраза «<b>{p}</b>» в кодировке {name}? "
                    f"(Кавычки не считаем.)",
            "answer": v, "unit": "байт",
            "hint": "Считай все символы: буквы, цифры, пробелы и знаки препинания.",
            "solution": [f"Символов во фразе (с пробелами и знаками): {n}",
                         f"{n} × {bits} бит = {n * bits} бит", f"{n * bits} бит : 8 = {v} байт"],
            "traps": {str(n * bits): "bits_bytes", str(no_spaces * bits // 8): "spaces",
                      str(no_spaces * bits): "spaces"},
        }
    # level 3: страницы → Кбайты
    while True:
        pages = rng.choice([2, 4, 8, 16, 32])
        lines = rng.choice([16, 32, 64])
        chars = rng.choice([32, 64, 128])
        bits, name = rng.choice(ENCODINGS)
        total_bytes = pages * lines * chars * bits // 8
        if total_bytes % 1024 == 0 and total_bytes // 1024 <= 512:
            break
    kb = total_bytes // 1024
    n = pages * lines * chars
    return {
        "text": f"Реферат набран на компьютере и содержит <b>{pages}</b> страниц, на каждой странице "
                f"<b>{lines}</b> строк, в каждой строке <b>{chars}</b> символов. Текст в кодировке {name}. "
                f"Каков объём реферата в <b>Кбайтах</b>?",
        "answer": kb, "unit": "Кбайт",
        "hint": "Найди общее число символов (страницы × строки × символы), умножь на вес символа и переведи в Кбайты.",
        "solution": [f"Символов: {pages} × {lines} × {chars} = {fmt(n)}",
                     f"Объём: {fmt(n)} × {bits} бит = {fmt(n * bits)} бит",
                     f"{fmt(n * bits)} бит : 8 = {fmt(total_bytes)} байт",
                     f"{fmt(total_bytes)} байт : 1024 = {kb} Кбайт"],
        "traps": {str(total_bytes): "one_step", str(kb * 8): "bits_bytes",
                  str(total_bytes / 1000): "kilo_1000", str(n * bits / 1024): "bits_bytes"},
    }
