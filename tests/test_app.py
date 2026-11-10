"""Проверяем, что страницы открываются и сценарий ученика работает от начала до конца."""
from tutor import course


def test_login_required(client):
    r = client.get("/")
    assert r.status_code == 302 and "/login" in r.headers["Location"]


def test_login_validation(client):
    r = client.post("/login", data={"name": "   ", "avatar": "🤖"})
    assert "Напиши своё имя".encode() in r.data


def test_login_and_home(logged):
    r = logged.get("/")
    assert r.status_code == 200
    assert "Сегодня репетитор советует".encode() in r.data
    assert "Тестовый ученик".encode() in r.data


def test_all_topic_pages_open(logged):
    for t in course.topics():
        for stage in ("step", "trainer", "tasks", "test", None):
            url = f"/topic/{t['num']}" + (f"?stage={stage}" if stage else "")
            assert logged.get(url).status_code == 200, url


def test_step_flow(logged):
    r = logged.post("/topic/8/step/0")
    assert r.status_code == 302 and "i=1" in r.headers["Location"]


def test_task_api_flow(logged):
    t = logged.post("/api/task/6/new").get_json()
    assert t["text"] and t["level"] == 1
    r = logged.post("/api/task/6/check", json={"answer": ""}).get_json()
    assert r["result"] == "invalid"
    r = logged.post("/api/task/6/check", json={"answer": "-1"}).get_json()
    assert r["result"] == "hint"
    r = logged.post("/api/task/6/check", json={"answer": "-2"}).get_json()
    assert r["result"] == "solution" and r["solution"]


def test_test_flow(logged, app):
    logged.get("/topic/8?stage=test")
    from tutor import db
    with app.test_request_context():
        uid = db.find_user("Тестовый ученик")["id"]
        questions = db.load_active(uid, "test:8")["questions"]
    answers = {str(q["id"]): str(q["answer"]) for q in questions}
    r = logged.post("/topic/8/test", data=answers)
    assert r.status_code == 200
    assert "Тест сдан".encode() in r.data


def test_review_page(logged):
    r = logged.get("/review/8")
    assert r.status_code == 200 and "Разминка".encode() in r.data
