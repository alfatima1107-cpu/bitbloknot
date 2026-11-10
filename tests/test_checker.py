from tutor import checker


def test_parse_number():
    assert checker.parse_number("24 576") == 24576
    assert checker.parse_number("2,5") == 2.5
    assert checker.parse_number(" 7 ") == 7
    assert checker.parse_number("семь") is None


def test_empty_and_invalid():
    task = {"kind": "number", "answer": 5}
    assert checker.check(task, "")["invalid"]
    assert checker.check(task, "пять")["invalid"]


def test_tolerance():
    task = {"kind": "number", "answer": 11, "exact": 10.99, "tolerance": 0.51, "traps": {"5.49": "stereo"}}
    assert checker.check(task, "11")["correct"]
    assert checker.check(task, "10,99")["correct"]
    assert checker.check(task, "5")["error_type"] == "stereo"


def test_text_answers():
    task = {"kind": "text", "answer": "D:\\Школа\\Тест\\ответы.txt",
            "traps": {"D:/Школа/Тест/ответы.txt": "path"}}
    assert checker.check(task, "d:\\школа\\тест\\ответы.txt")["correct"]
    assert checker.check(task, "  D:\\Школа\\Тест\\ответы.txt ")["correct"]
    assert checker.check(task, "D:/Школа/Тест/ответы.txt")["error_type"] == "path"


def test_hint_fallback():
    task = {"hint": "Общая подсказка"}
    assert checker.feedback_hint(task, None) == "Общая подсказка"
    assert "биты и байты" in checker.feedback_hint(task, "bits_bytes")
