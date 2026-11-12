// Вход ученика: код класса (6 цифр) + личный код (4 цифры).
import { DEMO } from "../api.js";
import { student, studentLogin } from "../session.js";
import { $, page } from "../ui.js";

if (student()) location.replace("home.html");
page({ back: "index.html" });

const form = $("#form"), cls = $("#class-code"), code = $("#code"), err = $("#error"), btn = $("#btn");
if (DEMO) {
  $("#demo").innerHTML = `<div class="demo-note" style="margin-top:14px">Демо-режим: классы хранятся только в этом браузере.
    Сначала создай класс на странице <a href="teacher-login.html">«Я учитель»</a>.</div>`;
}

// Только цифры; после 6 цифр кода класса курсор сам переходит к личному коду
for (const inp of [cls, code]) {
  inp.addEventListener("input", () => {
    inp.value = inp.value.replace(/\D/g, "");
    err.classList.add("hidden");
    if (inp === cls && inp.value.length === 6) code.focus();
    if (cls.value.length === 6 && code.value.length === 4 && !btn.disabled) form.requestSubmit();
  });
}

function showError(msg) { err.textContent = msg; err.classList.remove("hidden"); }

function lock(seconds) {
  const box = $("#lock-box");
  let s = seconds;
  btn.disabled = true;
  box.classList.remove("hidden");
  $("#lock-left").textContent = s;
  const t = setInterval(() => {
    s--;
    $("#lock-left").textContent = s;
    if (s <= 0) { clearInterval(t); box.classList.add("hidden"); btn.disabled = false; err.classList.add("hidden"); }
  }, 1000);
}

form.addEventListener("submit", async e => {
  e.preventDefault();
  if (cls.value.length !== 6) { showError("Код класса — ровно 6 цифр"); cls.focus(); return; }
  if (code.value.length !== 4) { showError("Личный код — ровно 4 цифры"); code.focus(); return; }
  btn.disabled = true;
  btn.textContent = "Вхожу…";
  try {
    await studentLogin(cls.value, code.value);
    location.href = "home.html";
  } catch (ex) {
    btn.disabled = false;
    btn.textContent = "Войти";
    showError(ex.message);
    if (ex.locked) lock(ex.locked);
    code.value = "";
    code.focus();
  }
});
