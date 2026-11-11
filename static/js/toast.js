// Всплывающие сообщения о новых достижениях (внизу экрана, 3 секунды).
window.BB_TOAST = {
  show: function (icon, title, desc) {
    const box = document.getElementById("toasts");
    if (!box) return;
    const t = document.createElement("div");
    t.className = "toast";
    t.innerHTML = `<span class="toast-icon">${icon}</span><span><b>Новое достижение: ${title}!</b><br><span class="small muted">${desc || ""}</span></span>`;
    box.appendChild(t);
    requestAnimationFrame(() => t.classList.add("in"));
    setTimeout(() => { t.classList.remove("in"); setTimeout(() => t.remove(), 400); }, 3200);
  },
  badges: function (list) {
    (list || []).forEach((b, i) => setTimeout(() => BB_TOAST.show(b.icon, b.title, b.desc), i * 900));
  },
};
