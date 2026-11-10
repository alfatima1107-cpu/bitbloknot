// Общие функции для тренажёров.
window.BB = window.BB || {};

// Сообщить серверу, что задание тренажёра выполнено (засчитывается в освоение темы).
BB.trainerDone = function () {
  const root = document.getElementById("trainer");
  if (!root || root.dataset.sent) return;
  root.dataset.sent = "1";
  fetch(root.dataset.doneUrl, { method: "POST" }).catch(() => {});
};

// Красивая запись числа: 24576 → «24 576».
BB.fmt = function (x) {
  if (typeof x !== "number" || !isFinite(x)) return String(x);
  const r = Math.round(x * 1000) / 1000;
  return r.toLocaleString("ru-RU");
};

// Показать сообщение в блоке обратной связи.
BB.feedback = function (el, cls, html) {
  el.className = "feedback " + cls;
  el.innerHTML = html;
};
