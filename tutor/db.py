"""Работа с базой данных SQLite.

Вся информация об учениках хранится в одном файле data/bitbloknot.db.
Таблицы:
  users         — ученики (имя и аватар)
  steps_done    — какие шаги уроков пройдены
  trainer_done  — в каких темах выполнено задание тренажёра
  attempts      — каждая решённая задача: верно или нет, тип ошибки, уровень
  tests         — результаты тестов
  topic_state   — состояние темы: уровень сложности, серии ответов, повторение
  active        — «текущая» задача или тест ученика (чтобы проверить ответ на сервере)
"""
import json
import sqlite3
from datetime import datetime

from flask import current_app, g

SCHEMA = """
CREATE TABLE IF NOT EXISTS users(
    id INTEGER PRIMARY KEY,
    name TEXT UNIQUE NOT NULL COLLATE NOCASE,
    avatar TEXT NOT NULL,
    created TEXT NOT NULL,
    last_seen TEXT
);
CREATE TABLE IF NOT EXISTS steps_done(
    user_id INTEGER, topic INTEGER, step INTEGER, ts TEXT,
    PRIMARY KEY(user_id, topic, step)
);
CREATE TABLE IF NOT EXISTS trainer_done(
    user_id INTEGER, topic INTEGER, ts TEXT,
    PRIMARY KEY(user_id, topic)
);
CREATE TABLE IF NOT EXISTS attempts(
    id INTEGER PRIMARY KEY,
    user_id INTEGER, topic INTEGER,
    kind TEXT,            -- 'task' (генератор), 'review' (повторение), 'quiz' (мини-вопрос)
    correct INTEGER,
    error_type TEXT,      -- распознанная типичная ошибка или NULL
    level INTEGER,
    ts TEXT
);
CREATE TABLE IF NOT EXISTS tests(
    id INTEGER PRIMARY KEY,
    user_id INTEGER, topic INTEGER, score INTEGER, total INTEGER, ts TEXT
);
CREATE TABLE IF NOT EXISTS topic_state(
    user_id INTEGER, topic INTEGER,
    level INTEGER NOT NULL DEFAULT 1,
    streak_ok INTEGER NOT NULL DEFAULT 0,
    streak_bad INTEGER NOT NULL DEFAULT 0,
    review_stage INTEGER,   -- NULL: тема ещё не сдана; 0..2: этап повторения; 3: повторения закончены
    review_due TEXT,        -- дата следующего повторения (ГГГГ-ММ-ДД)
    PRIMARY KEY(user_id, topic)
);
CREATE TABLE IF NOT EXISTS active(
    user_id INTEGER, slot TEXT, data TEXT,
    PRIMARY KEY(user_id, slot)
);
CREATE TABLE IF NOT EXISTS achievements(
    user_id INTEGER, code TEXT, ts TEXT,
    PRIMARY KEY(user_id, code)
);
"""

# Новые колонки, которые появились во 2-й версии (добавляются в старую базу без потери данных)
NEW_COLUMNS = {
    "users": {
        "pin_hash": "TEXT",                       # PIN хранится только в виде хеша
        "fail_count": "INTEGER NOT NULL DEFAULT 0",  # неверных PIN подряд
        "locked_until": "TEXT",                   # до какого времени вход заблокирован
        "best_streak": "INTEGER NOT NULL DEFAULT 0",
    },
    "attempts": {
        "solved": "INTEGER",                      # задача в итоге решена (с 1-й или 2-й попытки)
    },
}
SCHEMA_VERSION = 2


def now() -> str:
    return datetime.now().isoformat(timespec="seconds")


def get() -> sqlite3.Connection:
    """Соединение с базой для текущего запроса (одно на запрос)."""
    if "db" not in g:
        g.db = sqlite3.connect(current_app.config["DATABASE"])
        g.db.row_factory = sqlite3.Row
    return g.db


def close(_exc=None):
    conn = g.pop("db", None)
    if conn is not None:
        conn.close()


def init(path: str):
    """Создаёт таблицы и обновляет старую базу до новой версии (миграция)."""
    with sqlite3.connect(path) as conn:
        conn.executescript(SCHEMA)
        for table, cols in NEW_COLUMNS.items():
            have = {r[1] for r in conn.execute(f"PRAGMA table_info({table})")}
            for col, decl in cols.items():
                if col not in have:
                    conn.execute(f"ALTER TABLE {table} ADD COLUMN {col} {decl}")
        version = conn.execute("PRAGMA user_version").fetchone()[0]
        if version < 2:
            # тестовый профиль «Демо», созданный при разработке, больше не нужен
            row = conn.execute("SELECT id FROM users WHERE name = 'Демо' AND pin_hash IS NULL").fetchone()
            if row:
                _delete_user(conn, row[0])
            conn.execute(f"PRAGMA user_version = {SCHEMA_VERSION}")


USER_TABLES = ["steps_done", "trainer_done", "attempts", "tests", "topic_state", "active", "achievements"]


def _delete_user(conn, user_id):
    for t in USER_TABLES:
        conn.execute(f"DELETE FROM {t} WHERE user_id = ?", (user_id,))
    conn.execute("DELETE FROM users WHERE id = ?", (user_id,))


def query(sql, args=(), one=False):
    rows = get().execute(sql, args).fetchall()
    return (rows[0] if rows else None) if one else rows


def execute(sql, args=()):
    conn = get()
    cur = conn.execute(sql, args)
    conn.commit()
    return cur.lastrowid


# ---------- ученики ----------

def find_user(name):
    """Поиск по логину без учёта регистра — и для латиницы, и для русских букв.

    (Встроенное в SQLite сравнение NOCASE понимает только латиницу, поэтому сравниваем в Python.)
    """
    key = (name or "").strip().casefold()
    if not key:
        return None
    for row in query("SELECT * FROM users"):
        if row["name"].casefold() == key:
            return row
    return None


def user_by_id(user_id):
    return query("SELECT * FROM users WHERE id = ?", (user_id,), one=True)


def create_user(name, avatar, pin_hash=None):
    return execute(
        "INSERT INTO users(name, avatar, created, last_seen, pin_hash) VALUES(?, ?, ?, ?, ?)",
        (name, avatar, now(), now(), pin_hash),
    )


def update_user(user_id, **fields):
    cols = ", ".join(f"{k} = ?" for k in fields)
    execute(f"UPDATE users SET {cols} WHERE id = ?", (*fields.values(), user_id))


def touch_user(user_id):
    execute("UPDATE users SET last_seen = ? WHERE id = ?", (now(), user_id))


def all_users():
    return query("SELECT * FROM users ORDER BY last_seen DESC")


# ---------- «текущая» задача или тест ----------

def save_active(user_id, slot, data: dict):
    execute(
        "INSERT INTO active(user_id, slot, data) VALUES(?, ?, ?) "
        "ON CONFLICT(user_id, slot) DO UPDATE SET data = excluded.data",
        (user_id, slot, json.dumps(data, ensure_ascii=False)),
    )


def load_active(user_id, slot):
    row = query("SELECT data FROM active WHERE user_id = ? AND slot = ?", (user_id, slot), one=True)
    return json.loads(row["data"]) if row else None


def drop_active(user_id, slot):
    execute("DELETE FROM active WHERE user_id = ? AND slot = ?", (user_id, slot))


# ---------- состояние темы ----------

def topic_state(user_id, topic):
    row = query("SELECT * FROM topic_state WHERE user_id = ? AND topic = ?", (user_id, topic), one=True)
    if row is None:
        execute("INSERT INTO topic_state(user_id, topic) VALUES(?, ?)", (user_id, topic))
        row = query("SELECT * FROM topic_state WHERE user_id = ? AND topic = ?", (user_id, topic), one=True)
    return dict(row)


def update_topic_state(user_id, topic, **fields):
    topic_state(user_id, topic)  # создаёт строку, если её нет
    cols = ", ".join(f"{k} = ?" for k in fields)
    execute(f"UPDATE topic_state SET {cols} WHERE user_id = ? AND topic = ?",
            (*fields.values(), user_id, topic))
