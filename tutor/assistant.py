"""Заготовка ИИ-репетитора (этап 2, после MVP).

Сейчас БитБлокнот работает без ИИ: подсказки дают правила из tutor/checker.py и tutor/errors.py.
На втором этапе сюда подключим языковую модель (GigaChat или YandexGPT — они доступны из России),
чтобы ученик мог задать вопрос своими словами: «Почему 1 Кбайт — это 1024, а не 1000?»

Модель будет получать текст урока как контекст и отвечать в стиле репетитора:
не давать готовый ответ к задаче, а наводить на решение.
"""


class Assistant:
    """Общий интерфейс. Любая модель подключается через метод ask()."""

    name = "без ИИ"

    def ask(self, question: str, topic_title: str, lesson_text: str) -> str:
        raise NotImplementedError


class OfflineAssistant(Assistant):
    """Режим без ИИ: вежливо отправляет к шпаргалке темы."""

    name = "офлайн"

    def ask(self, question: str, topic_title: str, lesson_text: str) -> str:
        return (f"ИИ-помощник появится в следующей версии. Пока загляни в шпаргалку темы "
                f"«{topic_title}» — там собраны главные правила и формулы.")


def get_assistant() -> Assistant:
    """Здесь позже будем выбирать модель по настройкам (ключ API в файле data/ai.json)."""
    return OfflineAssistant()
