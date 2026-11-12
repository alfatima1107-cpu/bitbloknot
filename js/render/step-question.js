// Отрисовка мини-вопроса «Проверь себя» в шаге урока: выбор, порядок, пары, число.
// Правила проверки — в js/step-question.js. Перетаскивать можно мышью и пальцем,
// а для тех, кому неудобно тянуть, всегда есть запасной способ: нажать одну карточку, потом другую.
import * as SQ from "../step-question.js";
import { esc, icon } from "../ui.js";

const PAIR_COLORS = 6;

/**
 * box — контейнер; q — вопрос; onCorrect — вызывается после верного ответа (открывает «Дальше»).
 */
export function renderStepQuestion(box, q, onCorrect) {
  const type = SQ.typeOf(q);
  const hintByType = {
    choice: "",
    order: "Перетащи карточки или двигай их стрелками. Можно нажать одну карточку, потом другую — они поменяются местами.",
    match: "Нажми карточку слева, потом подходящую справа. Можно и перетащить. Нажми на соединённую карточку, чтобы выбрать пару заново.",
    number: "",
  };
  box.innerHTML = `<div class="small muted">${icon("help")} Проверь себя</div>
    <div style="margin-top:4px">${q.text}</div>
    ${hintByType[type] ? `<div class="small muted" style="margin-top:4px">${hintByType[type]}</div>` : ""}
    <div class="sq-body"></div>
    <div class="feedback hidden" id="qfeedback"><div class="fh"></div><div class="fb">${q.explain}</div></div>`;
  const body = box.querySelector(".sq-body");
  const fb = box.querySelector("#qfeedback");
  let solved = false;

  function show(res, badText) {
    fb.classList.remove("hidden", "ok", "bad", "warn");
    if (res.correct) {
      solved = true;
      fb.classList.add("ok");
      fb.querySelector(".fh").innerHTML = `${icon("check")} Верно!`;
      fb.querySelector(".fb").classList.remove("hidden");
      box.classList.add("solved");
      onCorrect();
    } else {
      fb.classList.add(res.invalid ? "warn" : "bad");
      fb.querySelector(".fh").textContent = res.message || badText;
      fb.querySelector(".fb").classList.add("hidden");
    }
  }

  // ---------- выбор одного варианта ----------
  if (type === "choice") {
    body.innerHTML = `<div class="choices">${q.options.map((o, i) => `<button class="choice" type="button" data-i="${i}">${o}</button>`).join("")}</div>`;
    body.querySelectorAll(".choice").forEach(btn => btn.addEventListener("click", () => {
      body.querySelectorAll(".choice").forEach(b => b.classList.remove("right", "wrong"));
      const res = SQ.check(q, Number(btn.dataset.i));
      btn.classList.add(res.correct ? "right" : "wrong");
      show(res, "Не совсем. Подумай ещё раз и выбери другой вариант.");
    }));
    return;
  }

  // ---------- число ----------
  if (type === "number") {
    body.innerHTML = `<form class="row sq-number" style="margin-top:10px">
      <input type="text" inputmode="decimal" autocomplete="off" aria-label="Ответ" style="width:160px">
      ${q.unit ? `<span>${esc(q.unit)}</span>` : ""}
      <button class="btn primary small" type="submit">Проверить</button></form>`;
    const form = body.querySelector("form"), input = form.querySelector("input");
    form.addEventListener("submit", e => {
      e.preventDefault();
      const res = SQ.check(q, input.value);
      input.classList.toggle("bad", !res.correct && !res.invalid);
      show(res, "Не совсем. Пересчитай ещё раз — подсказка в тексте шага.");
    });
    return;
  }

  // ---------- порядок ----------
  if (type === "order") {
    let order = SQ.shuffled(q.items.length);
    let picked = null;
    body.innerHTML = `<ol class="sq-order"></ol><button class="btn primary small" type="button" style="margin-top:10px">Проверить</button>`;
    const list = body.querySelector(".sq-order");
    const draw = (marks = null) => {
      list.innerHTML = order.map((it, pos) => `<li class="sq-card ${picked === pos ? "picked" : ""} ${marks ? (marks.includes(pos) ? "wrong" : "right") : ""}" data-pos="${pos}">
        <span class="sq-grip" aria-hidden="true">${icon("grip")}</span>
        <span class="sq-num">${pos + 1}</span>
        <span class="sq-text">${q.items[it]}</span>
        <span class="sq-arrows">
          <button type="button" class="btn small ghost" data-move="-1" aria-label="Выше" ${pos === 0 ? "disabled" : ""}>${icon("chevron-up")}</button>
          <button type="button" class="btn small ghost" data-move="1" aria-label="Ниже" ${pos === order.length - 1 ? "disabled" : ""}>${icon("chevron-down")}</button>
        </span></li>`).join("");
    };
    const move = (from, to) => {
      if (to < 0 || to >= order.length || from === to) return;
      const [x] = order.splice(from, 1);
      order.splice(to, 0, x);
    };
    draw();
    list.addEventListener("click", e => {
      if (solved) return;
      const li = e.target.closest(".sq-card"); if (!li) return;
      const pos = Number(li.dataset.pos);
      const mv = e.target.closest("[data-move]");
      if (mv) { move(pos, pos + Number(mv.dataset.move)); picked = null; draw(); return; }
      if (dragMoved) return;
      if (picked === null) picked = pos;
      else { [order[picked], order[pos]] = [order[pos], order[picked]]; picked = null; }
      draw();
    });
    // перетаскивание
    let drag = null, dragMoved = false;
    list.addEventListener("pointerdown", e => {
      if (solved || e.target.closest("[data-move]")) return;
      const li = e.target.closest(".sq-card"); if (!li) return;
      drag = { pos: Number(li.dataset.pos), y: e.clientY, li };
      dragMoved = false;
    });
    window.addEventListener("pointermove", e => {
      if (!drag) return;
      const dy = e.clientY - drag.y;
      if (!dragMoved && Math.abs(dy) < 6) return;
      if (!dragMoved) { dragMoved = true; picked = null; list.classList.add("dragging"); }
      e.preventDefault();
      drag.li.style.transform = `translateY(${dy}px)`;
      drag.li.classList.add("lifted");
      // над какой карточкой указатель — туда и переставляем
      const items = [...list.children];
      for (const other of items) {
        if (other === drag.li) continue;
        const r = other.getBoundingClientRect();
        const to = Number(other.dataset.pos);
        if (e.clientY > r.top && e.clientY < r.bottom && Math.abs(to - drag.pos) === 1) {
          move(drag.pos, to);
          draw();
          drag.pos = to;
          drag.li = list.children[to];
          drag.y = e.clientY;
          drag.li.classList.add("lifted");
          break;
        }
      }
    }, { passive: false });
    const end = () => {
      if (!drag) return;
      drag = null;
      list.classList.remove("dragging");
      if (dragMoved) draw();   // простой щелчок не перерисовываем, иначе потеряется событие click
      setTimeout(() => { dragMoved = false; }, 0);
    };
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
    body.querySelector("button.primary").addEventListener("click", () => {
      if (solved) return;
      const res = SQ.check(q, order);
      picked = null;
      draw(res.wrong);
      show(res, `Не совсем: ${res.wrong.length} из ${order.length} карточек стоят не на своём месте (они красные).`);
    });
    return;
  }

  // ---------- пары ----------
  if (type === "match") {
    const n = q.pairs.length;
    const right = SQ.shuffled(n);            // в каком порядке показаны правые карточки
    const link = Array(n).fill(null);        // link[левая] = индекс правой пары
    let pickedLeft = null;
    body.innerHTML = `<div class="sq-match">
      <div class="sq-col" data-side="l">${q.pairs.map((p, i) => `<button type="button" class="sq-card" data-l="${i}"><span class="sq-text">${p[0]}</span><span class="sq-tag"></span></button>`).join("")}</div>
      <div class="sq-col" data-side="r">${right.map(j => `<button type="button" class="sq-card" data-r="${j}"><span class="sq-tag"></span><span class="sq-text">${q.pairs[j][1]}</span></button>`).join("")}</div>
    </div><button class="btn primary small" type="button" style="margin-top:10px">Проверить</button>`;
    const L = [...body.querySelectorAll("[data-l]")], R = [...body.querySelectorAll("[data-r]")];
    const draw = (marks = null) => {
      L.forEach(b => {
        const i = Number(b.dataset.l), j = link[i];
        b.className = "sq-card" + (pickedLeft === i ? " picked" : "") + (j !== null ? ` paired c${i % PAIR_COLORS}` : "") +
          (marks && j !== null ? (marks.includes(i) ? " wrong" : " right") : "");
        b.querySelector(".sq-tag").innerHTML = j !== null ? icon("link") : "";
      });
      R.forEach(b => {
        const j = Number(b.dataset.r), i = link.indexOf(j);
        b.className = "sq-card" + (i >= 0 ? ` paired c${i % PAIR_COLORS}` : "") +
          (marks && i >= 0 ? (marks.includes(i) ? " wrong" : " right") : "");
        b.querySelector(".sq-tag").innerHTML = i >= 0 ? icon("link") : "";
      });
    };
    const connect = (i, j) => {
      const prev = link.indexOf(j);
      if (prev >= 0) link[prev] = null;
      link[i] = j;
      pickedLeft = null;
      draw();
    };
    L.forEach(b => b.addEventListener("click", () => {
      if (solved || dragged) return;
      const i = Number(b.dataset.l);
      if (link[i] !== null) { link[i] = null; pickedLeft = i; draw(); return; }   // соединённую пару выбираем заново
      pickedLeft = pickedLeft === i ? null : i;
      draw();
    }));
    R.forEach(b => b.addEventListener("click", () => {
      if (solved || dragged) return;
      const j = Number(b.dataset.r);
      if (pickedLeft !== null) { connect(pickedLeft, j); return; }
      const i = link.indexOf(j);
      if (i >= 0) { link[i] = null; draw(); }
    }));
    // перетаскивание: тянем от левой карточки к правой
    let from = null, dragged = false, sx = 0, sy = 0;
    L.forEach(b => b.addEventListener("pointerdown", e => {
      if (solved) return;
      from = Number(b.dataset.l); sx = e.clientX; sy = e.clientY; dragged = false;
    }));
    window.addEventListener("pointermove", e => {
      if (from === null) return;
      if (!dragged && Math.hypot(e.clientX - sx, e.clientY - sy) > 8) { dragged = true; pickedLeft = from; draw(); }
    });
    window.addEventListener("pointerup", e => {
      if (from === null) return;
      if (dragged) {
        const target = document.elementFromPoint(e.clientX, e.clientY)?.closest("[data-r]");
        if (target && body.contains(target)) connect(from, Number(target.dataset.r));
        else { pickedLeft = null; draw(); }
      }
      from = null;
      setTimeout(() => { dragged = false; }, 0);
    });
    body.querySelector("button.primary").addEventListener("click", () => {
      if (solved) return;
      const res = SQ.check(q, link);
      draw(res.invalid ? null : res.wrong);
      show(res, `Не совсем: ${res.wrong.length} из ${n} пар соединены неверно (они красные). Нажми на карточку, чтобы выбрать пару заново.`);
    });
    draw();
  }
}
