// Цифровая клавиатура для PIN: кнопки на экране и цифры с обычной клавиатуры.
(function () {
  const pads = [...document.querySelectorAll(".pinpad")];
  if (!pads.length) return;
  let active = pads[0];

  function render(pad) {
    const v = pad.querySelector("input").value;
    pad.querySelectorAll(".pin-dots i").forEach((d, i) => d.classList.toggle("on", i < v.length));
    pads.forEach(p => p.classList.toggle("active", p === active));
  }
  function press(pad, k) {
    const inp = pad.querySelector("input");
    if (k === "del") inp.value = inp.value.slice(0, -1);
    else if (k === "clear") inp.value = "";
    else if (/^\d$/.test(k) && inp.value.length < 4) inp.value += k;
    active = pad;
    // заполнили четыре цифры — переходим к следующей клавиатуре (например, «повтори PIN»)
    if (inp.value.length === 4) {
      const next = pads[pads.indexOf(pad) + 1];
      if (next && next.querySelector("input").value.length < 4) active = next;
    }
    pads.forEach(render);
    document.dispatchEvent(new CustomEvent("pinchange"));
  }
  pads.forEach(pad => {
    pad.addEventListener("click", e => {
      const b = e.target.closest(".pin-key");
      active = pad;
      if (b) press(pad, b.dataset.k); else pads.forEach(render);
    });
    render(pad);
  });
  document.addEventListener("keydown", e => {
    const t = e.target;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA") && t.type !== "hidden" && t.type !== "radio") return;
    if (/^\d$/.test(e.key)) { press(active, e.key); e.preventDefault(); }
    else if (e.key === "Backspace") { press(active, "del"); e.preventDefault(); }
  });
  // если фокус в поле логина и нажали Enter или Tab — переходим к PIN
  window.BB_PIN = { reset: () => pads.forEach(p => { p.querySelector("input").value = ""; render(p); }), pads };
})();
