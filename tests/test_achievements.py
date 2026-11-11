"""Серия дней и достижения."""
from datetime import date, timedelta

from tutor import achievements, adaptive, course, db

D = date(2026, 11, 20)


def days(*offsets):
    return {D - timedelta(days=o) for o in offsets}


def test_streak_basic():
    assert adaptive.streak_from_days(set(), D) == 0
    assert adaptive.streak_from_days(days(0, 1, 2), D) == 3
    assert adaptive.streak_from_days(days(1, 2), D) == 2          # сегодня ещё не занимался — серия жива


def test_streak_one_skip_forgiven():
    assert adaptive.streak_from_days(days(0, 1, 3, 4), D) == 4    # пропущен 1 день — прощается
    assert adaptive.streak_from_days(days(0, 1, 4, 5), D) == 2    # два дня подряд — сгорает
    assert adaptive.streak_from_days(days(0, 2, 4), D) == 2       # два пропуска за неделю — второй не прощён
    assert adaptive.streak_from_days(days(0, 1, 3, 4, 5, 6, 7, 8, 9, 11), D) == 10  # пропуски в 8 днях друг от друга


def _user(app):
    with app.test_request_context():
        return db.create_user("Значкист", "🤖", "x")


def test_each_badge_once(app, monkeypatch):
    uid = _user(app)
    monkeypatch.setattr(adaptive, "today", lambda: date.today())
    with app.test_request_context():
        assert achievements.check(uid) == []
        adaptive.record_step(uid, 8, 0)
        assert [b["title"] for b in achievements.check(uid)] == ["Первый шаг"]
        assert achievements.check(uid) == []                      # второй раз не выдаётся
        for _ in range(10):
            adaptive.record_task(uid, 6, True)
        got = {b["title"] for b in achievements.check(uid)}
        assert {"Снайпер", "Сложный уровень"} <= got
        for _ in range(10):
            adaptive.record_task(uid, 6, False, solved=True)
        assert "Работа над ошибками" in {b["title"] for b in achievements.check(uid)}
        for _ in range(80):
            adaptive.record_task(uid, 7, True)
        assert "Сотня" in {b["title"] for b in achievements.check(uid)}
        adaptive.record_trainer(uid, 8)
        adaptive.record_trainer(uid, 9)
        got = {b["title"] for b in achievements.check(uid)}
        assert {"Художник", "Звукорежиссёр"} <= got


def test_section_and_excellent_badges(app):
    uid = _user(app)
    with app.test_request_context():
        for t in course.topics():
            if t["section"] == 1:
                adaptive.record_test(uid, t["num"], 8, 10)
        got = {b["title"] for b in achievements.check(uid)}
        assert "Цифровой грамотей" in got and "Первая пятёрка" not in got
        adaptive.record_test(uid, 4, 10, 10)
        assert "Первая пятёрка" in {b["title"] for b in achievements.check(uid)}
        for t in course.topics():
            adaptive.record_test(uid, t["num"], 9, 10)
        got = {b["title"] for b in achievements.check(uid)}
        assert {"Теоретик", "Технолог", "Отличник"} <= got


def test_review_and_week_badges(app, monkeypatch):
    uid = _user(app)
    with app.test_request_context():
        adaptive.record_test(uid, 5, 8, 10)
        adaptive.record_review(uid, 5, 3, 3)
        assert "Не забыл!" in {b["title"] for b in achievements.check(uid)}
        for k in range(7):
            day = (date.today() - timedelta(days=k)).isoformat()
            db.execute("INSERT OR IGNORE INTO steps_done(user_id, topic, step, ts) VALUES(?, 3, ?, ?)",
                       (uid, k, day + "T10:00:00"))
        assert "Неделя" in {b["title"] for b in achievements.check(uid)}
        assert adaptive.streak(uid)["best"] >= 7


def test_badges_in_api_and_profile(logged):
    logged.post("/topic/8/step/0")
    r = logged.get("/")                                           # тост «Первый шаг» на следующей странице
    assert "BB_TOAST.badges".encode() in r.data and "\\u041f\\u0435\\u0440\\u0432\\u044b\\u0439".encode() in r.data
    assert "BB_TOAST.badges".encode() not in logged.get("/").data        # тост показывается один раз
    r = logged.get("/profile")
    assert "Первый шаг".encode() in r.data and "Мои достижения".encode() in r.data
