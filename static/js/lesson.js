// Страница урока: мини-вопрос после шага, шпаргалка, проверка заполненности теста.
(function () {
  // ----- мини-вопрос «Проверь себя» -----
  const box = document.getElementById("qbox");
  if (box) {
    const right = Number(box.dataset.answer);
    const fb = document.getElementById("qfeedback");
    const next = document.getElementById("next-btn");
    box.querySelectorAll(".choice").forEach(function (btn) {
      btn.addEventListener("click", function () {
        const i = Number(btn.dataset.i);
        box.querySelectorAll(".choice").forEach(b => b.classList.remove("right", "wrong"));
        fb.classList.remove("hidden", "ok", "bad");
        if (i === right) {
          btn.classList.add("right");
          fb.classList.add("ok");
          fb.querySelector(".fh").textContent = "Верно!";
          fb.querySelector(".fb").classList.remove("hidden");
          if (next) { next.disabled = false; next.title = ""; next.focus(); }
        } else {
          btn.classList.add("wrong");
          fb.classList.add("bad");
          fb.querySelector(".fh").textContent = "Не совсем. Подумай ещё раз и выбери другой вариант.";
          fb.querySelector(".fb").classList.add("hidden");
        }
      });
    });
  }

  // ----- шпаргалка -----
  const cheat = document.getElementById("cheat");
  const open = document.getElementById("cheat-open");
  const close = document.getElementById("cheat-close");
  if (cheat && open) {
    open.addEventListener("click", () => cheat.classList.add("open"));
    close.addEventListener("click", () => cheat.classList.remove("open"));
    document.addEventListener("keydown", e => { if (e.key === "Escape") cheat.classList.remove("open"); });
  }

  // ----- тест: все вопросы должны быть отвечены -----
  const form = document.getElementById("test-form");
  if (form) {
    const err = document.getElementById("test-error");
    form.noValidate = true;
    form.addEventListener("submit", function (e) {
      const names = new Set([...form.querySelectorAll("[name]")].map(el => el.name));
      let missing = null;
      names.forEach(function (n) {
        const els = form.querySelectorAll(`[name="${n}"]`);
        const filled = [...els].some(el => (el.type === "radio" ? el.checked : el.value.trim() !== ""));
        if (!filled && !missing) missing = els[0];
      });
      if (missing) {
        e.preventDefault();
        err.classList.remove("hidden");
        missing.closest(".test-q").scrollIntoView({ behavior: "smooth", block: "center" });
        if (missing.type !== "radio") missing.focus();
      }
    });
    form.addEventListener("input", () => err.classList.add("hidden"));
    form.addEventListener("change", function (e) {
      if (e.target.type === "radio") {
        form.querySelectorAll(`[name="${e.target.name}"]`).forEach(r => r.closest(".choice").classList.toggle("picked", r.checked));
      }
      err.classList.add("hidden");
    });
  }
})();
