// Вход и регистрация учителя по логину и паролю.
import { DEMO, call } from "../api.js";
import { keepTeacher, teacher } from "../session.js";
import { $, $$, page } from "../ui.js";

if (teacher()) location.replace("teacher.html");
page({ back: "index.html" });

let mode = "login";
const err = $("#error"), btn = $("#btn");
if (DEMO) {
  $("#demo").innerHTML = `<div class="demo-note" style="margin-top:14px">Демо-режим: аккаунт и классы хранятся только в этом браузере.
    Чтобы ученики входили с разных компьютеров, автор сайта подключает Google Таблицу (docs/GOOGLE-SHEETS.md).</div>`;
}

$$("#mode-tabs button").forEach(b => b.addEventListener("click", () => {
  mode = b.dataset.mode;
  $$("#mode-tabs button").forEach(x => x.classList.toggle("active", x === b));
  $$(".reg-only").forEach(x => x.classList.toggle("hidden", mode !== "register"));
  $("#password").autocomplete = mode === "register" ? "new-password" : "current-password";
  btn.firstChild.textContent = mode === "register" ? "Зарегистрироваться " : "Войти ";
  err.classList.add("hidden");
}));

function showError(msg) { err.textContent = msg; err.classList.remove("hidden"); }
$("#form").addEventListener("input", () => err.classList.add("hidden"));

$("#form").addEventListener("submit", async e => {
  e.preventDefault();
  const login = $("#email").value.trim(), password = $("#password").value;
  if (!login) return showError("Введите логин");
  if (!password) return showError("Введите пароль");
  if (mode === "register") {
    if (password.length < 6) return showError("Пароль — не меньше 6 символов");
    if (password !== $("#password2").value) return showError("Пароли не совпадают");
  }
  btn.disabled = true;
  try {
    const res = await call(mode === "register" ? "teacherRegister" : "teacherLogin", { login, password });
    keepTeacher(res.token, res.email);
    location.href = "teacher.html";
  } catch (ex) {
    btn.disabled = false;
    showError(ex.message);
  }
});
