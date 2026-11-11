"""Регистрация, вход по PIN, защита от подбора, старые профили, смена PIN."""
import sqlite3
from datetime import datetime, timedelta

from tutor import auth, db


def reg(client, login="Тима_2014", pin="1234", pin2=None, avatar="🦊"):
    return client.post("/register", data={"login": login, "pin": pin, "pin2": pin2 or pin, "avatar": avatar})


def test_register_shows_photo_card(client):
    r = reg(client)
    assert r.status_code == 200
    html = r.data.decode()
    assert "Сфотографируй меня" in html and "Тима_2014" in html and "1234" in html
    assert client.get("/").status_code == 200          # сразу вошёл


def test_register_validation(client):
    assert "слишком короткий" in reg(client, login="ab").data.decode()
    assert "только буквы, цифры" in reg(client, login="Тима 2014").data.decode()
    assert "4 цифры" in reg(client, pin="12a4").data.decode()
    assert "не совпадают" in reg(client, pin="1234", pin2="4321").data.decode()


def test_login_unique_case_insensitive(app):
    c1, c2 = app.test_client(), app.test_client()
    reg(c1, login="Тима")
    r = reg(c2, login="тима")
    assert "уже занят" in r.data.decode()
    r = reg(c2, login="TIMA")
    assert "Сфотографируй" in r.data.decode()


def test_pin_not_stored_in_plain_text(app, client):
    reg(client, pin="9753")
    conn = sqlite3.connect(app.config["DATABASE"])
    h = conn.execute("SELECT pin_hash FROM users").fetchone()[0]
    assert h and "9753" not in h


def test_login_ok_and_bad(app):
    reg(app.test_client(), login="Ученик1", pin="1111")
    c = app.test_client()
    r = c.post("/login", data={"login": "ученик1", "pin": "1111"})   # регистр не важен
    assert r.status_code == 302 and r.headers["Location"].endswith("/")
    c = app.test_client()
    r = c.post("/login", data={"login": "Ученик1", "pin": "2222"})
    assert "Неверный логин или PIN" in r.data.decode()
    r = c.post("/login", data={"login": "Никто", "pin": "1111"})
    assert "Неверный логин или PIN" in r.data.decode()                # не выдаём, что логина нет
    assert c.get("/").status_code == 302


def test_bruteforce_lock(app, monkeypatch):
    reg(app.test_client(), login="Жертва", pin="1111")
    t0 = datetime(2026, 11, 11, 12, 0, 0)
    monkeypatch.setattr(auth, "now", lambda: t0)
    c = app.test_client()
    for _ in range(4):
        r = c.post("/login", data={"login": "Жертва", "pin": "0000"})
        assert "Неверный" in r.data.decode()
    r = c.post("/login", data={"login": "Жертва", "pin": "0000"})      # 5-я ошибка — блокировка
    assert "заблокирован" in r.data.decode()
    r = c.post("/login", data={"login": "Жертва", "pin": "1111"})      # даже верный PIN не пускает
    assert "заблокирован" in r.data.decode()
    monkeypatch.setattr(auth, "now", lambda: t0 + timedelta(seconds=31))
    r = c.post("/login", data={"login": "Жертва", "pin": "1111"})
    assert r.status_code == 302


def test_old_profile_sets_pin(app):
    with app.test_request_context():
        uid = db.create_user("Тима", "🤖")                              # профиль из первой версии, без PIN
        db.execute("INSERT INTO steps_done(user_id, topic, step, ts) VALUES(?, 1, 0, ?)", (uid, db.now()))
    c = app.test_client()
    r = c.post("/login", data={"login": "Тима", "pin": ""})
    assert r.status_code == 302 and "/set-pin" in r.headers["Location"]
    r = c.post("/set-pin", data={"pin": "5555", "pin2": "5555"})
    assert "Сфотографируй" in r.data.decode()
    c2 = app.test_client()
    assert c2.post("/login", data={"login": "Тима", "pin": "5555"}).status_code == 302
    with app.test_request_context():
        assert db.query("SELECT COUNT(*) c FROM steps_done WHERE user_id = ?", (uid,), one=True)["c"] == 1


def test_migration_removes_demo_and_keeps_others(tmp_path):
    path = tmp_path / "old.db"
    conn = sqlite3.connect(path)
    conn.executescript("""
        CREATE TABLE users(id INTEGER PRIMARY KEY, name TEXT UNIQUE NOT NULL COLLATE NOCASE, avatar TEXT NOT NULL,
                           created TEXT NOT NULL, last_seen TEXT);
        INSERT INTO users(name, avatar, created) VALUES('Тима', '💻', '2026-11-10'), ('Демо', '🤖', '2026-11-10');
    """)
    conn.commit(); conn.close()
    db.init(str(path))
    conn = sqlite3.connect(path)
    names = [r[0] for r in conn.execute("SELECT name FROM users")]
    assert names == ["Тима"]
    cols = {r[1] for r in conn.execute("PRAGMA table_info(users)")}
    assert {"pin_hash", "fail_count", "locked_until", "best_streak"} <= cols


def test_change_pin(logged):
    from conftest import PIN
    r = logged.post("/profile/pin", data={"old": "0000", "pin": "1357", "pin2": "1357"})
    assert r.status_code == 400 and "Старый PIN введён неверно" in r.data.decode()
    r = logged.post("/profile/pin", data={"old": PIN, "pin": "1357", "pin2": "1357"})
    assert "PIN изменён" in r.data.decode()


def test_change_avatar(logged, app):
    logged.post("/profile/avatar", data={"avatar": "🐙"})
    with app.test_request_context():
        assert db.find_user("Тест_ученик")["avatar"] == "🐙"


def test_pages_require_login(client):
    for url in ["/", "/profile", "/topic/1"]:
        assert client.get(url).status_code == 302
