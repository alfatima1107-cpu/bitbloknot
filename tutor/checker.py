"""Проверка ответов и распознавание типичных ошибок."""
from . import errors


def parse_number(raw) -> float | None:
    """«24 576» → 24576.0, «2,5» → 2.5. Если это не число — None."""
    if isinstance(raw, (int, float)):
        return float(raw)
    s = str(raw).strip().replace(" ", "").replace(" ", "").replace(",", ".")
    try:
        return float(s)
    except ValueError:
        return None


def norm_text(s) -> str:
    """Нормализация строкового ответа: без лишних пробелов, без разницы в регистре и «ё/е»."""
    s = " ".join(str(s).split()).casefold().replace("ё", "е")
    s = s.replace(" \\", "\\").replace("\\ ", "\\")
    return s.rstrip("\\")


def _num_equal(a: float, b: float, tol: float) -> bool:
    return abs(a - b) <= max(tol, 1e-9 * max(1.0, abs(b)))


def check(task: dict, raw) -> dict:
    """Возвращает {'correct': bool, 'error_type': str|None, 'invalid': bool}."""
    kind = task.get("kind", "number")
    if raw is None or str(raw).strip() == "":
        return {"correct": False, "error_type": None, "invalid": True, "message": "Сначала введи ответ"}

    if kind == "number":
        value = parse_number(raw)
        if value is None:
            return {"correct": False, "error_type": None, "invalid": True, "message": "Ответ — это число. Введи только цифры"}
        tol = float(task.get("tolerance") or 0)
        target = float(task.get("exact", task["answer"]))
        if _num_equal(value, target, tol) or _num_equal(value, float(task["answer"]), 0):
            return {"correct": True, "error_type": None, "invalid": False}
        for trap, et in task.get("traps", {}).items():
            t = parse_number(trap)
            if t is not None and _num_equal(value, t, tol):
                return {"correct": False, "error_type": et, "invalid": False}
        return {"correct": False, "error_type": None, "invalid": False}

    # text и choice
    if norm_text(raw) == norm_text(task["answer"]):
        return {"correct": True, "error_type": None, "invalid": False}
    for trap, et in task.get("traps", {}).items():
        if norm_text(raw) == norm_text(trap):
            return {"correct": False, "error_type": et, "invalid": False}
    return {"correct": False, "error_type": None, "invalid": False}


def feedback_hint(task: dict, error_type: str | None) -> str:
    """Подсказка после первой ошибки: точная, если ошибка распознана, иначе общая."""
    return errors.hint(error_type) or task.get("hint") or "Попробуй ещё раз: перечитай условие внимательно."


def display_answer(task: dict) -> str:
    from .generators import fmt
    a = task["answer"]
    if task.get("kind", "number") == "number":
        num = parse_number(a)
        return f"{fmt(num)} {task.get('unit', '')}".strip()
    return str(a)
