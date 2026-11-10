// Бесконечные задачи: получить задачу с сервера, отправить ответ, показать подсказку или решение.
(function () {
  const root = document.getElementById("tasks");
  if (!root) return;
  const $ = id => document.getElementById(id);
  const text = $("task-text"), form = $("task-form"), wrap = $("task-input-wrap");
  const fb = $("task-feedback"), err = $("task-error"), nextBtn = $("next-task");
  const checkBtn = $("check-btn"), note = $("attempt-note");
  let kind = "number", choice = null, busy = false, finished = false;

  async function post(url, data) {
    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data || {}) });
    return r.json();
  }

  function setLevel(level, name, streak) {
    $("lvl-boxes").textContent = "■".repeat(level) + "□".repeat(3 - level);
    $("lvl-name").textContent = name;
    $("streak").textContent = streak;
  }

  function showFeedback(cls, head, body, steps) {
    fb.className = "feedback " + cls;
    fb.querySelector(".fh").textContent = head;
    fb.querySelector(".fb").innerHTML = body || "";
    const sol = fb.querySelector(".solution");
    sol.innerHTML = steps ? "<div class='small muted' style='margin-top:6px'>Решение:</div><ol>" + steps.map(s => `<li>${s}</li>`).join("") + "</ol>" : "";
  }

  async function newTask() {
    finished = false; choice = null;
    fb.className = "feedback hidden"; err.classList.add("hidden"); nextBtn.classList.add("hidden");
    $("level-note").classList.add("hidden");
    checkBtn.disabled = false; note.textContent = "";
    text.textContent = "Загружаю задачу…";
    const t = await post(root.dataset.new);
    kind = t.kind;
    text.innerHTML = t.text;
    setLevel(t.level, t.level_name, t.streak);
    wrap.innerHTML = "";
    if (kind === "choice") {
      t.options.forEach(function (o) {
        const b = document.createElement("button");
        b.type = "button"; b.className = "choice"; b.innerHTML = o; b.dataset.value = o;
        b.addEventListener("click", function () {
          if (finished) return;
          wrap.querySelectorAll(".choice").forEach(x => x.classList.remove("picked"));
          b.classList.add("picked"); choice = o; err.classList.add("hidden");
        });
        wrap.appendChild(b);
      });
    } else {
      const inp = document.createElement("input");
      inp.type = "text"; inp.id = "answer"; inp.inputMode = kind === "number" ? "decimal" : "text";
      inp.placeholder = t.placeholder || "Ответ";
      inp.style.width = kind === "number" ? "160px" : "min(420px, 70vw)";
      inp.addEventListener("input", () => { err.classList.add("hidden"); inp.classList.remove("bad"); });
      wrap.appendChild(inp);
      if (t.unit) { const u = document.createElement("span"); u.className = "muted"; u.textContent = t.unit; wrap.appendChild(u); }
      inp.focus();
    }
  }

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    if (busy || finished) return;
    const inp = $("answer");
    const answer = kind === "choice" ? choice : inp.value;
    if (answer === null || String(answer).trim() === "") {
      err.textContent = kind === "choice" ? "Сначала выбери вариант" : "Сначала введи ответ";
      err.classList.remove("hidden");
      if (inp) { inp.classList.add("bad"); inp.focus(); }
      return;
    }
    busy = true;
    const r = await post(root.dataset.check, { answer: answer });
    busy = false;
    if (r.result === "invalid") {
      err.textContent = r.message; err.classList.remove("hidden"); if (inp) inp.classList.add("bad"); return;
    }
    if (r.result === "expired") { newTask(); return; }
    if (r.result === "hint") {
      showFeedback("warn", r.diagnosed ? "Почти! " + r.message : "Не совсем.", r.diagnosed ? "Попробуй ещё раз." : r.message + " Попробуй ещё раз.");
      note.textContent = "попытка 2 из 2";
      if (inp) { inp.select(); inp.focus(); }
      return;
    }
    finished = true; checkBtn.disabled = true;
    $("solved").textContent = Number($("solved").textContent) + 1;
    setLevel(r.level, r.level_name, r.streak);
    if (r.result === "correct") {
      showFeedback("ok", r.first_try ? "Верно! Отлично!" : "Верно! Со второй попытки — тоже здорово.", "", r.solution);
    } else {
      showFeedback("bad", "Правильный ответ: " + r.answer, r.diagnosis ? r.diagnosis : "Разберём решение по шагам:", r.solution);
    }
    if (r.level_changed) {
      const ln = $("level-note");
      ln.className = "feedback " + (r.level_changed > 0 ? "ok" : "warn");
      ln.textContent = r.level_changed > 0 ? `Уровень повышен: ${r.level_name}! Задачи станут интереснее.`
                                           : `Уровень снижен до «${r.level_name}» — потренируемся на задачах попроще.`;
    }
    nextBtn.classList.remove("hidden"); nextBtn.focus();
  });

  nextBtn.addEventListener("click", newTask);
  newTask();
})();
