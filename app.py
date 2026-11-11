"""БитБлокнот — интерактивный веб-репетитор по информатике для 7 класса.

Точка входа: запускает веб-сервер Flask и описывает страницы сайта (маршруты).
Вся «умная» логика лежит в папке tutor/.
"""
import os
import secrets
from functools import wraps
from pathlib import Path

from flask import Flask, abort, g, jsonify, redirect, render_template, request, session, url_for

from tutor import achievements, adaptive, auth, checker, course, db, generators, quiz
from tutor.icons import icon

BASE = Path(__file__).resolve().parent
AVATARS = ["🤖", "🚀", "💻", "👻", "🐱", "🪐", "🦊", "🐼", "🐸", "🦉", "🐙", "🦄",
           "🐶", "🐯", "🐧", "🐢", "👾", "🛸", "⚡", "🎮", "⚽", "🏀", "🎸", "🧠"]


def create_app(test_config: dict | None = None) -> Flask:
    app = Flask(__name__)
    data_dir = BASE / "data"
    data_dir.mkdir(exist_ok=True)
    # BB_DATABASE — другой файл базы (например, для проверки, чтобы не трогать настоящий прогресс)
    app.config["DATABASE"] = os.environ.get("BB_DATABASE") or str(data_dir / "bitbloknot.db")
    app.config["SECRET_KEY"] = _secret_key(data_dir)
    app.config["SESSION_COOKIE_NAME"] = os.environ.get("BB_COOKIE", "session")
    if test_config:
        app.config.update(test_config)

    db.init(app.config["DATABASE"])
    app.teardown_appcontext(db.close)
    app.jinja_env.globals.update(icon=icon, sections=course.SECTIONS, level_names=adaptive.LEVEL_NAMES)

    register_routes(app)
    return app


def _secret_key(data_dir: Path) -> str:
    """Ключ для подписи cookie. Создаётся один раз и хранится в data/secret.key."""
    path = data_dir / "secret.key"
    if not path.exists():
        path.write_text(secrets.token_hex(32), encoding="utf-8")
    return path.read_text(encoding="utf-8").strip()


def login_required(view):
    @wraps(view)
    def wrapper(*args, **kwargs):
        if g.user is None or not g.user["pin_hash"]:
            session.pop("user_id", None)
            return redirect(url_for("login"))
        return view(*args, **kwargs)
    return wrapper


def award(uid) -> list[dict]:
    """Проверяет достижения после действия ученика и запоминает новые для всплывающего сообщения."""
    new = achievements.check(uid)
    if new:
        session["badges"] = session.get("badges", []) + new
    return new


def start_session(user_id):
    session.clear()
    session["user_id"] = user_id
    db.touch_user(user_id)
    g.user = db.user_by_id(user_id)   # чтобы шапка (с кнопкой «Выйти») сразу видела ученика


def register_routes(app: Flask):

    @app.before_request
    def load_user():
        uid = session.get("user_id")
        g.user = db.user_by_id(uid) if uid else None

    @app.context_processor
    def header_data():
        """Данные для шапки на каждой странице: серия дней и новые достижения."""
        data = {"streak": None, "new_badges": []}
        if g.get("user") is not None and g.user["pin_hash"]:
            data["streak"] = adaptive.streak(g.user["id"])["current"]
            data["new_badges"] = session.pop("badges", [])
        return data

    # ---------- регистрация и вход ----------

    @app.route("/register", methods=["GET", "POST"])
    def register():
        form = {"login": "", "avatar": AVATARS[0]}
        error = None
        if request.method == "POST":
            form["login"] = request.form.get("login", "").strip()
            form["avatar"] = request.form.get("avatar") if request.form.get("avatar") in AVATARS else AVATARS[0]
            pin, pin2 = request.form.get("pin", ""), request.form.get("pin2", "")
            error = auth.login_error(form["login"]) or auth.pin_error(pin, pin2)
            if not error and db.find_user(form["login"]):
                error = "Такой логин уже занят. Придумай другой"
            if not error:
                uid = db.create_user(form["login"], form["avatar"], auth.hash_pin(pin))
                start_session(uid)
                return render_template("welcome.html", login=form["login"], pin=pin,
                                       avatar=form["avatar"], reason="register")
        return render_template("register.html", avatars=AVATARS, form=form, error=error)

    @app.route("/login", methods=["GET", "POST"])
    def login():
        error, locked, login_value = None, 0, ""
        if request.method == "POST":
            login_value = request.form.get("login", "").strip()
            res = auth.try_login(login_value, request.form.get("pin", ""))
            if res["status"] == "ok":
                start_session(res["user"]["id"])
                award(res["user"]["id"])
                return redirect(url_for("home"))
            if res["status"] == "no_pin":
                session.clear()
                session["pending_user"] = res["user"]["id"]
                return redirect(url_for("set_pin"))
            if res["status"] == "locked":
                locked = res["seconds"]
                error = "Слишком много неверных попыток. Подожди немного"
            else:
                error = "Неверный логин или PIN"
                if res.get("left") is not None and res["left"] <= 2:
                    error += f". Осталось попыток: {res['left']}"
        return render_template("login.html", error=error, locked=locked, login_value=login_value)

    @app.route("/set-pin", methods=["GET", "POST"])
    def set_pin():
        """Старый профиль (созданный до появления PIN) один раз придумывает PIN."""
        user = db.user_by_id(session.get("pending_user")) if session.get("pending_user") else None
        if user is None or user["pin_hash"]:
            return redirect(url_for("login"))
        error = None
        if request.method == "POST":
            pin, pin2 = request.form.get("pin", ""), request.form.get("pin2", "")
            error = auth.pin_error(pin, pin2)
            if not error:
                db.update_user(user["id"], pin_hash=auth.hash_pin(pin), fail_count=0, locked_until=None)
                start_session(user["id"])
                return render_template("welcome.html", login=user["name"], pin=pin,
                                       avatar=user["avatar"], reason="set_pin")
        return render_template("set_pin.html", user=user, error=error)

    @app.route("/logout")
    def logout():
        session.clear()
        return redirect(url_for("login"))

    # ---------- личный кабинет ----------

    @app.route("/profile")
    @login_required
    def profile():
        return render_template("profile.html", stats=adaptive.profile_stats(g.user["id"]),
                               badges=achievements.owned(g.user["id"]), avatars=AVATARS,
                               msg=request.args.get("msg"), error=None)

    @app.post("/profile/avatar")
    @login_required
    def profile_avatar():
        avatar = request.form.get("avatar")
        if avatar in AVATARS:
            db.update_user(g.user["id"], avatar=avatar)
        return redirect(url_for("profile", msg="Аватар изменён"))

    @app.post("/profile/pin")
    @login_required
    def profile_pin():
        old, pin, pin2 = (request.form.get(k, "") for k in ("old", "pin", "pin2"))
        error = None if auth.pin_ok(g.user, old) else "Старый PIN введён неверно"
        error = error or auth.pin_error(pin, pin2)
        if error:
            return render_template("profile.html", stats=adaptive.profile_stats(g.user["id"]),
                                   badges=achievements.owned(g.user["id"]), avatars=AVATARS,
                                   msg=None, error=error), 400
        db.update_user(g.user["id"], pin_hash=auth.hash_pin(pin))
        return render_template("welcome.html", login=g.user["name"], pin=pin,
                               avatar=g.user["avatar"], reason="change_pin")

    # ---------- главная ----------

    @app.route("/")
    @login_required
    def home():
        ov = adaptive.overview(g.user["id"])
        by_num = {i["topic"]["num"]: i for i in ov["items"]}
        return render_template("home.html", ov=ov, by_num=by_num, sections_list=course.by_section())

    # ---------- тема: шаги урока, тренажёр, задачи, тест ----------

    def topic_context(num):
        t = course.topic(num) or abort(404)
        lesson = course.lesson(num)
        s = adaptive.stats(g.user["id"], t)
        return t, lesson, s

    @app.route("/topic/<int:num>")
    @login_required
    def topic(num):
        t, lesson, s = topic_context(num)
        stage = request.args.get("stage")
        if stage is None:
            nxt = adaptive.next_stage(t, s)
            stage = nxt["kind"]
            index = nxt.get("index", 0)
        else:
            index = request.args.get("i", 0, type=int)
        if stage == "step":
            if not lesson["steps"]:
                stage = "test"
            else:
                index = max(0, min(index, len(lesson["steps"]) - 1))
        if stage == "trainer" and not t.get("trainer"):
            stage = "test"
        if stage == "tasks" and not t.get("generator"):
            stage = "test"
        if stage not in ("step", "trainer", "tasks", "test"):
            abort(404)

        test_questions = None
        if stage == "test":
            test_questions = quiz.build(num)
            db.save_active(g.user["id"], f"test:{num}", {"questions": test_questions})

        return render_template(
            "topic.html", t=t, lesson=lesson, s=s, stage=stage, index=index,
            step=lesson["steps"][index] if stage == "step" else None,
            questions=test_questions, mastery=adaptive.mastery(t, s),
        )

    @app.post("/topic/<int:num>/step/<int:index>")
    @login_required
    def step_done(num, index):
        t, lesson, s = topic_context(num)
        if 0 <= index < len(lesson["steps"]):
            adaptive.record_step(g.user["id"], num, index)
            award(g.user["id"])
        if index + 1 < len(lesson["steps"]):
            return redirect(url_for("topic", num=num, stage="step", i=index + 1))
        if t.get("trainer"):
            return redirect(url_for("topic", num=num, stage="trainer"))
        if t.get("generator"):
            return redirect(url_for("topic", num=num, stage="tasks"))
        return redirect(url_for("topic", num=num, stage="test"))

    @app.post("/topic/<int:num>/test")
    @login_required
    def test_submit(num):
        t = course.topic(num) or abort(404)
        active = db.load_active(g.user["id"], f"test:{num}")
        if not active:
            return redirect(url_for("topic", num=num, stage="test"))
        questions = active["questions"]
        score, results = quiz.grade(questions, request.form)
        for r in results:
            if r["error_type"]:
                db.execute("INSERT INTO attempts(user_id, topic, kind, correct, error_type, level, ts) "
                           "VALUES(?, ?, 'test', 0, ?, NULL, ?)",
                           (g.user["id"], num, r["error_type"], db.now()))
        info = adaptive.record_test(g.user["id"], num, score, len(questions))
        db.drop_active(g.user["id"], f"test:{num}")
        award(g.user["id"])
        return render_template("test_result.html", t=t, score=score, total=len(questions),
                               results=results, info=info, review=False)

    # ---------- повторение (разминка из 3 задач) ----------

    @app.route("/review/<int:num>", methods=["GET", "POST"])
    @login_required
    def review(num):
        t = course.topic(num) or abort(404)
        slot = f"review:{num}"
        if request.method == "POST":
            active = db.load_active(g.user["id"], slot)
            if not active:
                return redirect(url_for("review", num=num))
            questions = active["questions"]
            score, results = quiz.grade(questions, request.form)
            for r in results:
                adaptive.record_task(g.user["id"], num, r["correct"], r["error_type"], kind="review",
                                     solved=r["correct"])
            info = adaptive.record_review(g.user["id"], num, score, len(questions))
            db.drop_active(g.user["id"], slot)
            award(g.user["id"])
            return render_template("test_result.html", t=t, score=score, total=len(questions),
                                   results=results, info=info, review=True)
        questions = quiz.build(num, count=3)
        db.save_active(g.user["id"], slot, {"questions": questions})
        return render_template("review.html", t=t, questions=questions)

    # ---------- API для задач и тренажёров (JavaScript на странице) ----------

    @app.post("/api/task/<int:num>/new")
    @login_required
    def api_task_new(num):
        t = course.topic(num) or abort(404)
        if not t.get("generator"):
            abort(404)
        st = db.topic_state(g.user["id"], num)
        task = generators.make(t["generator"], st["level"])
        db.save_active(g.user["id"], f"task:{num}", {"task": task, "attempts": 0, "first_error": None})
        return jsonify({
            "text": task["text"], "kind": task["kind"], "options": task.get("options"),
            "unit": task["unit"], "placeholder": task.get("placeholder", ""),
            "level": st["level"], "level_name": adaptive.LEVEL_NAMES[st["level"]], "streak": st["streak_ok"],
        })

    @app.post("/api/task/<int:num>/check")
    @login_required
    def api_task_check(num):
        slot = f"task:{num}"
        active = db.load_active(g.user["id"], slot)
        if not active:
            return jsonify({"result": "expired"}), 400
        task = active["task"]
        res = checker.check(task, (request.get_json(silent=True) or {}).get("answer"))
        if res.get("invalid"):
            return jsonify({"result": "invalid", "message": res["message"]})
        active["attempts"] += 1
        if res["correct"]:
            state = adaptive.record_task(g.user["id"], num, active["attempts"] == 1, active["first_error"],
                                         solved=True)
            db.drop_active(g.user["id"], slot)
            return jsonify({"result": "correct", "first_try": active["attempts"] == 1,
                            "solution": task["solution"], "badges": achievements.check(g.user["id"]),
                            **_level_payload(state)})
        if active["attempts"] == 1:
            active["first_error"] = res["error_type"]
            db.save_active(g.user["id"], slot, active)
            return jsonify({"result": "hint", "diagnosed": res["error_type"] is not None,
                            "message": checker.feedback_hint(task, res["error_type"])})
        state = adaptive.record_task(g.user["id"], num, False, active["first_error"] or res["error_type"],
                                     solved=False)
        db.drop_active(g.user["id"], slot)
        return jsonify({"result": "solution", "solution": task["solution"],
                        "answer": checker.display_answer(task),
                        "diagnosis": checker.feedback_hint(task, res["error_type"]) if res["error_type"] else None,
                        "badges": achievements.check(g.user["id"]), **_level_payload(state)})

    def _level_payload(state):
        return {"level": state["level"], "level_name": adaptive.LEVEL_NAMES[state["level"]],
                "streak": state["streak"], "level_changed": state["changed"]}

    @app.post("/api/trainer/<int:num>/done")
    @login_required
    def api_trainer_done(num):
        course.topic(num) or abort(404)
        adaptive.record_trainer(g.user["id"], num)
        return jsonify({"ok": True, "badges": achievements.check(g.user["id"])})


app = create_app() if __name__ == "__main__" else None

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="127.0.0.1", port=port, debug=os.environ.get("BB_DEBUG") == "1")
