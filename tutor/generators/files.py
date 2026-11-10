"""Тема 2. Файлы и папки: типы файлов по расширению, полные пути, маски * и ?."""
import fnmatch

TYPES = {
    "текстовый документ": ["docx", "txt", "odt", "rtf"],
    "рисунок": ["png", "jpg", "bmp", "gif"],
    "звук": ["mp3", "wav", "ogg"],
    "видео": ["mp4", "avi", "mkv"],
    "программа": ["exe"],
    "архив": ["zip", "rar", "7z"],
}
NAMES = ["доклад", "отчёт", "кот", "песня", "фото", "игра", "контрольная", "план", "проект", "задачи"]
FOLDERS = ["Школа", "Информатика", "Физика", "Музыка", "Фото", "Игры", "Документы", "Проекты", "Тесты", "Лето"]
DISKS = ["C", "D"]

MASK_FILES = ["cat.txt", "cats.txt", "car.doc", "bat.txt", "act.txt", "cap.txt", "map.doc", "mat.txt",
              "data.txt", "date.doc", "art.png", "start.txt", "a.txt", "dart.txt", "cart.doc", "card.txt"]


def match(name: str, mask: str) -> bool:
    return fnmatch.fnmatchcase(name.lower(), mask.lower())


def generate(level, rng):
    if level == 1:
        kind = rng.choice(list(TYPES))
        ext = rng.choice(TYPES[kind])
        name = f"{rng.choice(NAMES)}.{ext}"
        options = [kind] + rng.sample([k for k in TYPES if k != kind], 3)
        rng.shuffle(options)
        return {
            "kind": "choice",
            "text": f"Что, скорее всего, хранится в файле <code>{name}</code>?",
            "options": options, "answer": kind,
            "hint": "Тип файла подсказывает расширение — часть имени после последней точки.",
            "solution": [f"Расширение файла — .{ext}", f".{ext} — это {kind}"],
        }
    if level == 2:
        disk = rng.choice(DISKS)
        depth = rng.choice([2, 3])
        folders = rng.sample(FOLDERS, depth)
        fname = f"{rng.choice(NAMES)}.{rng.choice(['txt', 'docx', 'png', 'mp3'])}"
        path = disk + ":\\" + "\\".join(folders + [fname])
        desc = f"на диске <b>{disk}:</b>"
        for f in folders:
            desc += f" → в папке <b>{f}</b>"
        return {
            "kind": "text",
            "text": f"Файл <code>{fname}</code> лежит {desc}. Запиши <b>полный путь</b> к файлу.",
            "answer": path,
            "placeholder": "Например, C:\\Папка\\файл.txt",
            "hint": "Полный путь: диск, двоеточие, обратная косая черта, затем папки от внешней к внутренней "
                    "и в конце имя файла.",
            "solution": [f"Начинаем с диска: {disk}:\\",
                         "Дальше папки по порядку: " + " → ".join(folders),
                         f"В конце имя файла: {fname}", f"Ответ: {path}"],
            "traps": {
                path.replace("\\", "/"): "path",
                "\\".join(folders + [fname]): "path",
                disk + ":\\" + "\\".join(list(reversed(folders)) + [fname]): "path",
            },
        }
    # level 3
    if rng.random() < 0.5:
        masks = ["?at.txt", "c*.txt", "?a*.txt", "*t.doc", "??t.txt", "*ar*.*", "c?t*.txt", "*.doc"]
        while True:
            mask = rng.choice(masks)
            yes = [f for f in MASK_FILES if match(f, mask)]
            no = [f for f in MASK_FILES if not match(f, mask)]
            star_twin = mask.replace("?", "*")
            near = [f for f in no if match(f, star_twin)]
            if yes and len(no) >= 3:
                break
        right = rng.choice(yes)
        wrong = rng.sample(near, min(1, len(near)))
        wrong += rng.sample([f for f in no if f not in wrong], 3 - len(wrong))
        options = [right] + wrong
        rng.shuffle(options)
        return {
            "kind": "choice",
            "text": f"Какой из файлов подходит под маску <code>{mask}</code>?",
            "options": options, "answer": right,
            "hint": "Звёздочка * — любое количество любых символов (даже ни одного), знак ? — ровно один любой символ.",
            "solution": [f"Маска {mask}: " + ", ".join(
                ("? — один символ" if c == "?" else "* — сколько угодно символов") for c in mask if c in "*?"),
                f"Подходит {right}",
            ] + [f"{w} — не подходит" for w in wrong],
            "traps": {w: "mask" for w in near if w in options},
        }
    disk = rng.choice(DISKS)
    a, b, c = rng.sample(FOLDERS, 3)
    fname = f"{rng.choice(NAMES)}.txt"
    old = f"{disk}:\\{a}\\{b}\\{fname}"
    new = f"{disk}:\\{c}\\{fname}"
    return {
        "kind": "text",
        "text": f"Файл <code>{old}</code> переместили в папку <b>{c}</b>, которая находится прямо на диске "
                f"<b>{disk}:</b>. Каким стал полный путь к файлу?",
        "answer": new,
        "placeholder": "Например, C:\\Папка\\файл.txt",
        "hint": "При перемещении имя файла не меняется, меняются только папки в пути.",
        "solution": [f"Новая папка {c} лежит прямо на диске {disk}:", f"Имя файла то же: {fname}", f"Ответ: {new}"],
        "traps": {f"{disk}:\\{a}\\{b}\\{c}\\{fname}": "path", f"{disk}:\\{a}\\{c}\\{fname}": "path",
                  new.replace("\\", "/"): "path"},
    }
