"""Достижения (значки). Каждое правило — простая проверка по данным из базы.

check(user_id) проверяет все правила и возвращает значки, которые ученик получил только что.
Значок выдаётся один раз и навсегда.
"""
from . import adaptive, course, db

CATALOG = [
    {"code": "first_step", "icon": "👣", "title": "Первый шаг", "desc": "Пройден первый шаг урока"},
    {"code": "first_five", "icon": "⭐", "title": "Первая пятёрка", "desc": "Тест сдан на «5»"},
    {"code": "sniper", "icon": "🎯", "title": "Снайпер", "desc": "10 задач подряд с первой попытки"},
    {"code": "fixer", "icon": "🔍", "title": "Работа над ошибками", "desc": "10 раз исправил ошибку со второй попытки"},
    {"code": "hard_level", "icon": "🧗", "title": "Сложный уровень", "desc": "Достигнут сложный уровень задач"},
    {"code": "hundred", "icon": "💯", "title": "Сотня", "desc": "Решено 100 задач"},
    {"code": "not_forgot", "icon": "🧠", "title": "Не забыл!", "desc": "Пройдено первое повторение темы"},
    {"code": "artist", "icon": "🎨", "title": "Художник", "desc": "Выполнен тренажёр «Пиксельный художник»"},
    {"code": "sound", "icon": "🎧", "title": "Звукорежиссёр", "desc": "Выполнен тренажёр «Звукозапись»"},
    {"code": "section1", "icon": "💻", "title": "Цифровой грамотей", "desc": "Сданы все темы раздела 1"},
    {"code": "section2", "icon": "📐", "title": "Теоретик", "desc": "Сданы все темы раздела 2"},
    {"code": "section3", "icon": "🛠️", "title": "Технолог", "desc": "Сданы все темы раздела 3"},
    {"code": "week", "icon": "🔥", "title": "Неделя", "desc": "Серия 7 дней"},
    {"code": "excellent", "icon": "🏆", "title": "Отличник", "desc": "Сданы все 12 тем"},
]
BY_CODE = {a["code"]: a for a in CATALOG}


def _count(sql, args) -> int:
    return db.query(sql, args, one=True)[0] or 0


def _passed_topics(uid) -> set[int]:
    rows = db.query("SELECT topic FROM tests WHERE user_id = ? GROUP BY topic "
                    "HAVING MAX(100.0 * score / total) >= ?", (uid, adaptive.PASS))
    return {r["topic"] for r in rows}


def _best_run(uid) -> int:
    """Самая длинная серия задач, решённых с первой попытки подряд."""
    best = run = 0
    for r in db.query("SELECT correct FROM attempts WHERE user_id = ? AND kind = 'task' ORDER BY id", (uid,)):
        run = run + 1 if r["correct"] else 0
        best = max(best, run)
    return best


def earned(uid) -> set[str]:
    """Какие условия выполнены прямо сейчас."""
    got = set()
    if _count("SELECT COUNT(*) FROM steps_done WHERE user_id = ?", (uid,)):
        got.add("first_step")
    if _count("SELECT COUNT(*) FROM tests WHERE user_id = ? AND 100.0 * score / total >= 90", (uid,)):
        got.add("first_five")
    if _best_run(uid) >= 10:
        got.add("sniper")
    if _count("SELECT COUNT(*) FROM attempts WHERE user_id = ? AND kind = 'task' AND correct = 0 AND solved = 1",
              (uid,)) >= 10:
        got.add("fixer")
    if _count("SELECT COUNT(*) FROM topic_state WHERE user_id = ? AND level >= 3", (uid,)):
        got.add("hard_level")
    if _count("SELECT COUNT(*) FROM attempts WHERE user_id = ? AND kind = 'task'", (uid,)) >= 100:
        got.add("hundred")
    if _count("SELECT COUNT(*) FROM topic_state WHERE user_id = ? AND review_stage >= 1", (uid,)):
        got.add("not_forgot")
    if _count("SELECT COUNT(*) FROM trainer_done WHERE user_id = ? AND topic = 8", (uid,)):
        got.add("artist")
    if _count("SELECT COUNT(*) FROM trainer_done WHERE user_id = ? AND topic = 9", (uid,)):
        got.add("sound")
    passed = _passed_topics(uid)
    for s in (1, 2, 3):
        nums = {t["num"] for t in course.topics() if t["section"] == s}
        if nums <= passed:
            got.add(f"section{s}")
    if adaptive.streak(uid)["best"] >= 7:
        got.add("week")
    if {t["num"] for t in course.topics()} <= passed:
        got.add("excellent")
    return got


def owned(uid) -> list[dict]:
    rows = db.query("SELECT code, ts FROM achievements WHERE user_id = ? ORDER BY ts, rowid", (uid,))
    return [{**BY_CODE[r["code"]], "ts": r["ts"]} for r in rows if r["code"] in BY_CODE]


def check(uid) -> list[dict]:
    """Выдаёт новые значки и возвращает их список (пустой, если новых нет)."""
    have = {r["code"] for r in db.query("SELECT code FROM achievements WHERE user_id = ?", (uid,))}
    new = [a for a in CATALOG if a["code"] in earned(uid) - have]
    for a in new:
        db.execute("INSERT OR IGNORE INTO achievements(user_id, code, ts) VALUES(?, ?, ?)", (uid, a["code"], db.now()))
    return [{"icon": a["icon"], "title": a["title"], "desc": a["desc"]} for a in new]
