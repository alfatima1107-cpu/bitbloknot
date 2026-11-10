// Переключатель темы: тёмная тетрадь ⇄ светлая тетрадь. Выбор запоминается в браузере.
(function () {
  const btn = document.getElementById("theme-toggle");
  if (!btn) return;
  btn.addEventListener("click", function () {
    const root = document.documentElement;
    const next = root.dataset.theme === "light" ? "dark" : "light";
    root.dataset.theme = next;
    try { localStorage.setItem("bb-theme", next); } catch (e) { /* приватный режим — не страшно */ }
    btn.querySelector(".t-dark").classList.toggle("hidden", next === "light");
    btn.querySelector(".t-light").classList.toggle("hidden", next !== "light");
  });
  const isLight = document.documentElement.dataset.theme === "light";
  btn.querySelector(".t-dark").classList.toggle("hidden", isLight);
  btn.querySelector(".t-light").classList.toggle("hidden", !isLight);
})();
