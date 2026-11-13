// Умное оглавление урока. Состояние хранится классами на <body>, поэтому переживает перерисовку страницы.
//
//   lp-collapsed — ученик начал листать вниз: на широком экране оглавление сворачивается в колонку точек
//   lp-pinned    — булавка: оглавление не сворачивается само (запоминается)
//   lp-hidden    — оглавление скрыто целиком (запоминается), остаётся маленькая кнопка «Содержание»
//   lp-peek      — свёрнутое оглавление раскрыто поверх страницы (по нажатию на колонку точек)
//   lp-sheet     — на телефоне открыт выдвижной лист «Содержание»
//   lp-bar-hidden — на телефоне нижняя панель спрятана, пока листаешь вниз
//
// Какое из этого видно на каком экране — решает css/lesson.css.

const KEY = "bb-toc";
const STEP = 8;          // меньше 8 px прокрутки — это дрожание, не реагируем
const COLLAPSE_AT = 80;  // сворачиваем, когда пролистали больше 80 px от верха

function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
function save(st) { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* без памяти тоже работает */ } }

let started = false;

export function closeOverlays() { document.body.classList.remove("lp-peek", "lp-sheet"); }

export function initLessonNav() {
  if (started) return;
  started = true;
  const b = document.body, st = load();
  b.classList.toggle("lp-pinned", !!st.pinned);
  b.classList.toggle("lp-hidden", !!st.hidden);

  let lastY = scrollY, ticking = false;
  function onScroll() {
    ticking = false;
    const y = scrollY, d = y - lastY;
    if (Math.abs(d) < STEP) return;
    if (d > 0 && y > COLLAPSE_AT) {
      b.classList.add("lp-collapsed", "lp-bar-hidden");
      b.classList.remove("lp-peek");
    } else if (d < 0) {
      b.classList.remove("lp-bar-hidden");
      if (y < COLLAPSE_AT / 2) b.classList.remove("lp-collapsed");
    }
    lastY = y;
  }
  addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });

  document.addEventListener("click", e => {
    const a = e.target.closest("[data-nav]");
    if (!a) {
      // щелчок мимо раскрытого оглавления закрывает его
      if (b.classList.contains("lp-peek") && !e.target.closest(".lp-toc")) b.classList.remove("lp-peek");
      if (b.classList.contains("lp-sheet") && e.target.closest(".lp-scrim")) b.classList.remove("lp-sheet");
      return;
    }
    e.preventDefault();
    const s = load();
    switch (a.dataset.nav) {
      case "pin": s.pinned = !b.classList.contains("lp-pinned"); b.classList.toggle("lp-pinned", s.pinned); b.classList.remove("lp-collapsed", "lp-peek"); break;
      case "hide": s.hidden = true; b.classList.add("lp-hidden"); closeOverlays(); break;
      case "show": s.hidden = false; b.classList.remove("lp-hidden", "lp-collapsed"); break;
      case "peek": b.classList.toggle("lp-peek"); break;
      case "sheet": b.classList.toggle("lp-sheet"); break;
      case "close": closeOverlays(); break;
    }
    save(s);
  });
  document.addEventListener("keydown", e => { if (e.key === "Escape") closeOverlays(); });
}
