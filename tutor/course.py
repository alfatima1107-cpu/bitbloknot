"""Содержание курса: список тем и уроки.

Уроки лежат в папке content/ в виде JSON-файлов, поэтому их можно дополнять,
не трогая программный код.
"""
import json
from pathlib import Path

CONTENT = Path(__file__).resolve().parent.parent / "content"

SECTIONS = {
    1: "Цифровая грамотность",
    2: "Теоретические основы информатики",
    3: "Информационные технологии",
}

_cache: dict = {}


def _load(path: Path):
    """Читает JSON и запоминает его; если файл изменили — перечитывает."""
    mtime = path.stat().st_mtime
    hit = _cache.get(path)
    if hit and hit[0] == mtime:
        return hit[1]
    data = json.loads(path.read_text(encoding="utf-8"))
    _cache[path] = (mtime, data)
    return data


def topics() -> list[dict]:
    return _load(CONTENT / "topics.json")


def topic(num: int) -> dict | None:
    return next((t for t in topics() if t["num"] == num), None)


def lesson(num: int) -> dict:
    """Урок темы: шаги, шпаргалка и банк вопросов теста."""
    files = sorted(CONTENT.glob(f"{num:02d}_*.json"))
    if not files:
        return {"steps": [], "cheatsheet": "", "test_bank": []}
    return _load(files[0])


def by_section() -> list[tuple[int, str, list[dict]]]:
    return [(s, name, [t for t in topics() if t["section"] == s]) for s, name in SECTIONS.items()]
