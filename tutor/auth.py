"""Вход по логину и PIN.

Безопасность, о которой можно рассказать жюри:
1. PIN не хранится в базе. Хранится только его «хеш» — результат необратимой функции.
   При входе мы считаем хеш введённого PIN и сравниваем хеши. Даже имея файл базы, PIN не прочитать.
2. Защита от подбора. У PIN из 4 цифр всего 10 000 вариантов — перебрать их программой легко.
   Поэтому после 5 неверных попыток подряд вход по этому логину блокируется на 30 секунд:
   перебор всех вариантов займёт больше 16 часов.
"""
import re
from datetime import datetime, timedelta

from werkzeug.security import check_password_hash, generate_password_hash

from . import db

LOGIN_RE = re.compile(r"^[A-Za-zА-Яа-яЁё0-9_]{3,20}$")
PIN_RE = re.compile(r"^\d{4}$")
MAX_FAILS = 5
LOCK_SECONDS = 30


def now() -> datetime:
    """Текущее время (вынесено в функцию, чтобы в тестах можно было «перемотать» время)."""
    return datetime.now()


def login_error(login: str) -> str | None:
    if not login:
        return "Придумай логин"
    if len(login) < 3:
        return "Логин слишком короткий — нужно хотя бы 3 символа"
    if len(login) > 20:
        return "Логин слишком длинный — не больше 20 символов"
    if not LOGIN_RE.match(login):
        return "В логине можно использовать только буквы, цифры и знак _ (без пробелов)"
    return None


def pin_error(pin: str, pin2: str | None = None) -> str | None:
    if not PIN_RE.match(pin or ""):
        return "PIN — это ровно 4 цифры"
    if pin2 is not None and pin != pin2:
        return "PIN-коды не совпадают. Введи один и тот же PIN два раза"
    return None


def hash_pin(pin: str) -> str:
    return generate_password_hash(pin)


def pin_ok(user, pin: str) -> bool:
    return bool(user["pin_hash"]) and check_password_hash(user["pin_hash"], pin or "")


def seconds_locked(user) -> int:
    """Сколько секунд ещё действует блокировка (0 — вход открыт)."""
    if not user["locked_until"]:
        return 0
    left = (datetime.fromisoformat(user["locked_until"]) - now()).total_seconds()
    return max(0, int(left + 0.999))


def try_login(login: str, pin: str) -> dict:
    """Проверка входа. Возвращает {'status': ok | bad | locked | no_pin, 'user': ..., 'seconds': ...}."""
    user = db.find_user(login)
    if user is None:
        return {"status": "bad"}
    if not user["pin_hash"]:
        return {"status": "no_pin", "user": user}      # старый профиль без PIN
    left = seconds_locked(user)
    if left:
        return {"status": "locked", "seconds": left}
    if pin_ok(user, pin):
        db.update_user(user["id"], fail_count=0, locked_until=None)
        return {"status": "ok", "user": user}
    fails = user["fail_count"] + 1
    if fails >= MAX_FAILS:
        until = (now() + timedelta(seconds=LOCK_SECONDS)).isoformat(timespec="seconds")
        db.update_user(user["id"], fail_count=0, locked_until=until)
        return {"status": "locked", "seconds": LOCK_SECONDS}
    db.update_user(user["id"], fail_count=fails)
    return {"status": "bad", "left": MAX_FAILS - fails}
