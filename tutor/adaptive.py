"""«Умный репетитор» без ИИ — набор понятных правил.

1. Уровни сложности: 3 верных ответа подряд — уровень выше, 2 ошибки подряд — ниже.
2. Освоение темы (0–100 %): шаги урока 20 %, тренажёр 10 %, задачи 30 %, тест 40 %.
   Если в теме нет тренажёра или задач, проценты делятся между остальными частями.
3. Интервальное повторение: сданная тема возвращается через 1, 3 и 7 дней.
4. Блок «Сегодня»: недоконченный урок → тест хуже 70 % → подошло повторение → следующая тема.
"""
from datetime import date, timedelta

from . import course, db, errors

PASS = 70                     # зачёт по тесту, %
REVIEW_INTERVALS = [1, 3, 7]  # через сколько дней повторять сданную тему
UP_AFTER = 3                  # столько верных подряд — уровень выше
DOWN_AFTER = 2                # столько ошибок подряд — уровень ниже
MAX_LEVEL = 3
LEVEL_NAMES = {1: "лёгкий", 2: "средний", 3: "сложный"}


def today() -> date:
    """Сегодняшняя дата (вынесена в функцию, чтобы в тестах можно было «перемотать» время)."""
    return date.today()


def grade(pct: float) -> int:
    if pct >= 90:
        return 5
    if pct >= PASS:
        return 4
    if pct >= 50:
        return 3
    return 2


def plural(n: int, one: str, few: str, many: str) -> str:
    """plural(3, 'раз', 'раза', 'раз') → 'раза'."""
    n = abs(n) % 100
    if 11 <= n <= 14:
        return many
    n %= 10
    return one if n == 1 else few if 2 <= n <= 4 else many


# ---------- запись результатов ----------

def record_step(user_id, topic, step):
    db.execute("INSERT OR IGNORE INTO steps_done(user_id, topic, step, ts) VALUES(?, ?, ?, ?)",
               (user_id, topic, step, db.now()))


def record_trainer(user_id, topic):
    db.execute("INSERT OR IGNORE INTO trainer_done(user_id, topic, ts) VALUES(?, ?, ?)",
               (user_id, topic, db.now()))


def record_task(user_id, topic, first_try: bool, error_type=None, kind="task") -> dict:
    """Записывает решённую задачу и меняет уровень сложности. Возвращает новое состояние."""
    st = db.topic_state(user_id, topic)
    level = st["level"]
    db.execute("INSERT INTO attempts(user_id, topic, kind, correct, error_type, level, ts) "
               "VALUES(?, ?, ?, ?, ?, ?, ?)",
               (user_id, topic, kind, int(first_try), error_type, level, db.now()))
    ok, bad = st["streak_ok"], st["streak_bad"]
    changed = 0
    if first_try:
        ok, bad = ok + 1, 0
        if ok >= UP_AFTER and level < MAX_LEVEL:
            level, ok, changed = level + 1, 0, +1
    else:
        ok, bad = 0, bad + 1
        if bad >= DOWN_AFTER and level > 1:
            level, bad, changed = level - 1, 0, -1
    if kind == "task":
        db.update_topic_state(user_id, topic, level=level, streak_ok=ok, streak_bad=bad)
    return {"level": level, "streak": ok, "changed": changed}


def record_test(user_id, topic, score, total) -> dict:
    db.execute("INSERT INTO tests(user_id, topic, score, total, ts) VALUES(?, ?, ?, ?, ?)",
               (user_id, topic, score, total, db.now()))
    pct = round(100 * score / total)
    passed = pct >= PASS
    st = db.topic_state(user_id, topic)
    due = None
    if passed and st["review_stage"] is None:
        due = today() + timedelta(days=REVIEW_INTERVALS[0])
        db.update_topic_state(user_id, topic, review_stage=0, review_due=due.isoformat())
    elif passed and st["review_due"]:
        due = date.fromisoformat(st["review_due"])
    return {"pct": pct, "grade": grade(pct), "passed": passed, "review_due": due}


def record_review(user_id, topic, correct: int, total: int) -> dict:
    """Разминка-повторение: 2 из 3 — переходим к следующему интервалу, иначе повторим завтра."""
    st = db.topic_state(user_id, topic)
    stage = st["review_stage"] or 0
    success = correct * 3 >= total * 2
    if success:
        stage += 1
        if stage >= len(REVIEW_INTERVALS):
            db.update_topic_state(user_id, topic, review_stage=stage, review_due=None)
            return {"success": True, "finished": True, "due": None}
        due = today() + timedelta(days=REVIEW_INTERVALS[stage])
    else:
        due = today() + timedelta(days=1)
    db.update_topic_state(user_id, topic, review_stage=stage, review_due=due.isoformat())
    return {"success": success, "finished": False, "due": due}


# ---------- статистика темы ----------

def stats(user_id, t: dict) -> dict:
    n = t["num"]
    lesson = course.lesson(n)
    steps_total = len(lesson["steps"])
    done = {r["step"] for r in db.query("SELECT step FROM steps_done WHERE user_id = ? AND topic = ?", (user_id, n))}
    trainer = db.query("SELECT 1 FROM trainer_done WHERE user_id = ? AND topic = ?", (user_id, n), one=True) is not None
    recent = db.query("SELECT correct FROM attempts WHERE user_id = ? AND topic = ? AND kind = 'task' "
                      "ORDER BY id DESC LIMIT 10", (user_id, n))
    tasks_count = db.query("SELECT COUNT(*) c FROM attempts WHERE user_id = ? AND topic = ? AND kind = 'task'",
                           (user_id, n), one=True)["c"]
    best = db.query("SELECT MAX(100.0 * score / total) b, COUNT(*) c FROM tests WHERE user_id = ? AND topic = ?",
                    (user_id, n), one=True)
    last = db.query(
        "SELECT MAX(ts) m FROM (SELECT ts FROM steps_done WHERE user_id=:u AND topic=:t "
        "UNION ALL SELECT ts FROM attempts WHERE user_id=:u AND topic=:t "
        "UNION ALL SELECT ts FROM tests WHERE user_id=:u AND topic=:t "
        "UNION ALL SELECT ts FROM trainer_done WHERE user_id=:u AND topic=:t)",
        {"u": user_id, "t": n}, one=True)["m"]
    st = db.topic_state(user_id, n)
    return {
        "steps_total": steps_total,
        "steps_done": len(done),
        "done_steps": done,
        "trainer_done": trainer,
        "tasks_count": tasks_count,
        "accuracy": (sum(r["correct"] for r in recent) / len(recent)) if recent else None,
        "best_test": round(best["b"]) if best["b"] is not None else None,
        "tests_count": best["c"],
        "last_activity": last,
        "level": st["level"],
        "streak": st["streak_ok"],
        "review_stage": st["review_stage"],
        "review_due": date.fromisoformat(st["review_due"]) if st["review_due"] else None,
    }


def mastery(t: dict, s: dict) -> int:
    parts = [(20, s["steps_done"] / s["steps_total"] if s["steps_total"] else 0)]
    if t.get("trainer"):
        parts.append((10, 1.0 if s["trainer_done"] else 0.0))
    if t.get("generator"):
        parts.append((30, s["accuracy"] or 0.0))
    parts.append((40, (s["best_test"] or 0) / 100))
    total_w = sum(w for w, _ in parts)
    return round(100 * sum(w * v for w, v in parts) / total_w)


def next_stage(t: dict, s: dict) -> dict:
    """Что ученику делать дальше в теме: шаг урока, тренажёр, задачи или тест."""
    for i in range(s["steps_total"]):
        if i not in s["done_steps"]:
            return {"kind": "step", "index": i, "label": f"шаг {i + 1} из {s['steps_total']}"}
    if t.get("trainer") and not s["trainer_done"]:
        return {"kind": "trainer", "label": "тренажёр"}
    if t.get("generator") and s["tasks_count"] < 5:
        return {"kind": "tasks", "label": "задачи"}
    return {"kind": "test", "label": "тест"}


def top_error(user_id, topic, days=14):
    since = (today() - timedelta(days=days)).isoformat()
    row = db.query("SELECT error_type, COUNT(*) c FROM attempts WHERE user_id = ? AND topic = ? "
                   "AND error_type IS NOT NULL AND ts >= ? GROUP BY error_type ORDER BY c DESC LIMIT 1",
                   (user_id, topic, since), one=True)
    return (row["error_type"], row["c"]) if row else (None, 0)


def _error_sentence(user_id, topic) -> str | None:
    et, c = top_error(user_id, topic)
    phrase = errors.reason(et)
    if not phrase or c < 2:
        return None
    return f"Недавно ты {c} {plural(c, 'раз', 'раза', 'раз')} {phrase}."


# ---------- обзор курса и блок «Сегодня» ----------

def overview(user_id) -> dict:
    topics = course.topics()
    passed = set()
    items = []
    for t in topics:
        s = stats(user_id, t)
        if s["best_test"] is not None and s["best_test"] >= PASS:
            passed.add(t["num"])
        items.append({"topic": t, "stats": s, "mastery": mastery(t, s), "stage": next_stage(t, s)})

    tday = today()
    recs = []
    # 1) недоконченный урок (самый свежий)
    unfinished = [i for i in items if i["stats"]["last_activity"] and i["stats"]["tests_count"] == 0]
    unfinished.sort(key=lambda i: i["stats"]["last_activity"], reverse=True)
    for i in unfinished:
        recs.append({"kind": "continue", "item": i,
                     "title": f"Продолжить тему {i['topic']['num']} «{i['topic']['title']}»",
                     "reason": f"Ты остановился на этапе «{i['stage']['label']}».",
                     "action": "Продолжить", "minutes": 10})
    # 2) тест сдан хуже 70 %
    for i in items:
        b = i["stats"]["best_test"]
        if b is not None and b < PASS:
            reason = _error_sentence(user_id, i["topic"]["num"]) or f"Лучший результат теста — {b} %, а для зачёта нужно {PASS} %."
            recs.append({"kind": "retest", "item": i,
                         "title": f"Подтянуть тему {i['topic']['num']} «{i['topic']['title']}»",
                         "reason": reason, "action": "Повторить и пересдать", "minutes": 10})
    # 3) подошёл срок повторения
    for i in items:
        due = i["stats"]["review_due"]
        if due and due <= tday:
            reason = _error_sentence(user_id, i["topic"]["num"]) or "Чтобы не забыть: повторение через несколько дней помогает запомнить надолго."
            recs.append({"kind": "review", "item": i,
                         "title": f"Повторить «{i['topic']['title']}»",
                         "reason": reason + " Разминка из трёх задач.", "action": "Начать разминку", "minutes": 3})
    # 4) следующая тема по программе
    fresh = [i for i in items if not i["stats"]["last_activity"]]
    ready = [i for i in fresh if all(p in passed for p in i["topic"]["prereq"])]
    nxt = (ready or fresh)[:1]
    for i in nxt:
        pre = i["topic"]["prereq"]
        reason = (f"Ты уже знаешь всё, что нужно: тема {pre[0]} сдана." if pre and pre[0] in passed
                  else "Следующая тема по программе 7 класса.")
        recs.append({"kind": "next", "item": i,
                     "title": f"Начать тему {i['topic']['num']} «{i['topic']['title']}»",
                     "reason": reason, "action": "Начать", "minutes": 15})

    current_num = recs[0]["item"]["topic"]["num"] if recs and recs[0]["kind"] == "continue" else None
    for i in items:
        i["status"] = _status(i, passed, tday, current_num)

    course_pct = round(sum(i["mastery"] for i in items) / len(items)) if items else 0
    return {"items": items, "today": recs[0] if recs else None,
            "also": recs[1] if len(recs) > 1 else None, "course_pct": course_pct,
            "passed": len(passed)}


def _status(i, passed, tday, current_num) -> dict:
    s, t = i["stats"], i["topic"]
    b = s["best_test"]
    if b is not None and b < PASS:
        return {"kind": "retest", "label": "повторить"}
    if s["review_due"] and s["review_due"] <= tday:
        return {"kind": "review", "label": "повторить", "grade": grade(b) if b is not None else None}
    if b is not None:
        return {"kind": "passed", "label": "сдана", "grade": grade(b)}
    if t["num"] == current_num:
        return {"kind": "current", "label": i["stage"]["label"]}
    if s["last_activity"]:
        return {"kind": "progress", "label": "в процессе"}
    missing = [p for p in t["prereq"] if p not in passed]
    if missing:
        return {"kind": "later", "label": f"лучше после темы {missing[0]}"}
    return {"kind": "new", "label": "не начата"}
