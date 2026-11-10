"""Проверяем правила «умного репетитора»."""
from datetime import date, timedelta

from tutor import adaptive, course, db


def test_grade_scale():
    assert adaptive.grade(100) == 5
    assert adaptive.grade(90) == 5
    assert adaptive.grade(89) == 4
    assert adaptive.grade(70) == 4
    assert adaptive.grade(69) == 3
    assert adaptive.grade(50) == 3
    assert adaptive.grade(49) == 2


def test_plural():
    assert adaptive.plural(1, "раз", "раза", "раз") == "раз"
    assert adaptive.plural(3, "раз", "раза", "раз") == "раза"
    assert adaptive.plural(5, "раз", "раза", "раз") == "раз"
    assert adaptive.plural(12, "раз", "раза", "раз") == "раз"
    assert adaptive.plural(22, "раз", "раза", "раз") == "раза"


def _user(app):
    with app.test_request_context():
        return db.create_user("Ученик", "🤖")


def test_level_up_and_down(app):
    uid = _user(app)
    with app.test_request_context():
        for _ in range(3):
            st = adaptive.record_task(uid, 6, True)
        assert st["level"] == 2 and st["changed"] == 1
        for _ in range(3):
            st = adaptive.record_task(uid, 6, True)
        assert st["level"] == 3
        st = adaptive.record_task(uid, 6, True)
        assert st["level"] == 3            # выше сложного не бывает
        adaptive.record_task(uid, 6, False)
        st = adaptive.record_task(uid, 6, False)
        assert st["level"] == 2 and st["changed"] == -1


def test_mastery_weights(app):
    uid = _user(app)
    with app.test_request_context():
        t = course.topic(8)
        s = adaptive.stats(uid, t)
        assert adaptive.mastery(t, s) == 0
        for i in range(s["steps_total"]):
            adaptive.record_step(uid, 8, i)
        s = adaptive.stats(uid, t)
        assert adaptive.mastery(t, s) == 20          # шаги — 20 %
        adaptive.record_trainer(uid, 8)
        s = adaptive.stats(uid, t)
        assert adaptive.mastery(t, s) == 30          # + тренажёр 10 %
        adaptive.record_test(uid, 8, 10, 10)
        s = adaptive.stats(uid, t)
        assert adaptive.mastery(t, s) == 70          # + тест 40 % (задач пока нет)


def test_review_schedule(app, monkeypatch):
    uid = _user(app)
    day0 = date(2026, 11, 10)
    monkeypatch.setattr(adaptive, "today", lambda: day0)
    with app.test_request_context():
        info = adaptive.record_test(uid, 8, 8, 10)
        assert info["passed"] and info["review_due"] == day0 + timedelta(days=1)
        monkeypatch.setattr(adaptive, "today", lambda: day0 + timedelta(days=1))
        assert adaptive.overview(uid)["today"]["kind"] == "review"
        r = adaptive.record_review(uid, 8, 2, 3)
        assert r["due"] == day0 + timedelta(days=4)  # дальше через 3 дня
        r = adaptive.record_review(uid, 8, 1, 3)
        assert not r["success"] and r["due"] == day0 + timedelta(days=2)  # не вышло — завтра
        adaptive.record_review(uid, 8, 3, 3)
        r = adaptive.record_review(uid, 8, 3, 3)
        assert r["finished"]


def test_today_priorities(app):
    uid = _user(app)
    with app.test_request_context():
        ov = adaptive.overview(uid)
        assert ov["today"]["kind"] == "next"
        assert ov["today"]["item"]["topic"]["num"] == 1     # начинаем с первой темы
        adaptive.record_step(uid, 8, 0)
        ov = adaptive.overview(uid)
        assert ov["today"]["kind"] == "continue" and ov["today"]["item"]["topic"]["num"] == 8
        adaptive.record_test(uid, 8, 5, 10)
        adaptive.record_task(uid, 8, False, "bits_bytes")
        adaptive.record_task(uid, 8, False, "bits_bytes")
        ov = adaptive.overview(uid)
        assert ov["today"]["kind"] == "retest"
        assert "путал биты и байты" in ov["today"]["reason"]
