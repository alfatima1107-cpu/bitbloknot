// Набор для объёмных анимаций на Three.js — им пользуются все иллюстрации и тренажёры.
//
// Three.js подключается с CDN и только тогда, когда на странице появилась первая сцена.
// Фрагменты иллюстраций — обычные скрипты (не модули), поэтому они получают набор через
// window.BB.three(контейнер, настройки) → Promise<kit | null>. null — WebGL не работает, вместо сцены
// уже показана запасная картинка, и иллюстрации нужно просто ничего не делать.
//
// Что умеет kit:
//   THREE, scene, camera, renderer         — обычные объекты Three.js
//   mat("ac" | "#hex", настройки)          — материал; цвет-токен темы перекрашивается сам при смене темы
//   color("ac")                            — THREE.Color из CSS-переменной темы
//   label(текст, {size, color, bg, bold})  — надпись-спрайт; label.set(новыйТекст) меняет текст
//   onPick(fn) / pick(event)               — щелчок или касание по объекту с userData.pick
//   tween(obj, {"position.x": 2}, мс)      — плавный переход (Promise)
//   onFrame(fn(dt, t))                     — что делать каждый кадр
//   onTheme(fn)                            — что делать, когда сменилась тема или цвет
//   reduced                                — пользователь просил меньше анимации
//   dispose()                              — освободить видеопамять (страница делает это сама)

export const THREE_URL = "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

let threePromise = null;
export function loadThree() {
  if (!threePromise) threePromise = import(THREE_URL);
  return threePromise;
}

const kits = new Set();

/** Освободить все сцены (вызывается перед перерисовкой страницы). */
export function disposeAll() {
  for (const k of [...kits]) k.dispose();
}

function webglOk() {
  try {
    const c = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl")));
  } catch (e) { return false; }
}

const TOKENS = ["ac", "acs", "acb", "tx", "mut", "line", "card", "card-2", "bg", "ok", "err", "wr", "okb", "errb"];

/** Цвета темы как "rgb(r, g, b)": браузер сам подставляет --h, --sat и т.д. */
function readTokens() {
  const probe = document.createElement("span");
  probe.style.display = "none";
  document.body.appendChild(probe);
  const out = {};
  for (const t of TOKENS) {
    probe.style.color = `var(--${t})`;
    out[t] = getComputedStyle(probe).color;
  }
  probe.remove();
  return out;
}

const FONT = '"Segoe UI", system-ui, -apple-system, Roboto, Arial, sans-serif';

function fallbackHtml(text) {
  return `<div class="scene-fallback small muted">${text ||
    "Объёмная анимация не запустилась: браузер не поддерживает WebGL или нет интернета. Остальной урок работает."}</div>`;
}

/**
 * Создать сцену в контейнере el.
 * opts: { height = 260, ortho = false, fit: [ширина, высота] — область, которая всегда видна целиком, fov = 40,
 *         camera: [x, y, z], target: [x, y, z], fallback: "html запасной картинки" }
 */
export async function createKit(el, opts = {}) {
  if (!el) return null;
  if (!webglOk()) { el.innerHTML = fallbackHtml(opts.fallback); return null; }
  let THREE;
  try { THREE = await loadThree(); } catch (e) { el.innerHTML = fallbackHtml(opts.fallback); return null; }
  if (!el.isConnected) return null;   // ученик уже ушёл на другой шаг

  const height = opts.height || 260;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const wrap = document.createElement("div");
  wrap.className = "scene3d";
  wrap.style.height = height + "px";
  el.appendChild(wrap);

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  } catch (e) { wrap.remove(); el.insertAdjacentHTML("beforeend", fallbackHtml(opts.fallback)); return null; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  wrap.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const view = opts.view || 10;
  const camera = opts.ortho
    ? new THREE.OrthographicCamera(-view / 2, view / 2, view / 2, -view / 2, 0.1, 200)
    : new THREE.PerspectiveCamera(opts.fov || 40, 1, 0.1, 200);
  const cp = opts.camera || [0, 0, opts.ortho ? 50 : 14];
  camera.position.set(cp[0], cp[1], cp[2]);
  const target = new THREE.Vector3(...(opts.target || [0, 0, 0]));
  camera.lookAt(target);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x667788, 2.2));
  const sun = new THREE.DirectionalLight(0xffffff, 2.0);
  sun.position.set(4, 8, 10);
  scene.add(sun);

  // ---------- цвета темы ----------
  let tokens = readTokens();
  const themed = [];          // [material, token, свойство]
  const themeFns = [];
  const color = (c) => new THREE.Color(tokens[c] || c);
  function mat(c = "ac", o = {}) {
    const { basic, ...rest } = o;
    const m = basic ? new THREE.MeshBasicMaterial(rest) : new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0.05, ...rest });
    m.color = color(c);
    if (tokens[c]) themed.push([m, c]);
    return m;
  }
  const mo = new MutationObserver(() => {
    tokens = readTokens();
    for (const [m, c] of themed) m.color.set(tokens[c]);
    for (const l of labels) l.redraw();
    for (const fn of themeFns) fn(kit);
  });
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "data-accent"] });

  // ---------- надписи ----------
  const labels = new Set();
  function label(text, o = {}) {
    const canvas = document.createElement("canvas");
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.LinearFilter;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: !!o.depth }));
    const size = o.size || 0.5;            // высота строки в единицах сцены
    sprite.renderOrder = 10;            // надписи всегда поверх фигур
    let current = String(text);
    sprite.redraw = () => {
      const px = 64, pad = o.bg ? 18 : 6;
      const font = `${o.bold ? 700 : 500} ${px}px ${o.mono ? "Consolas, monospace" : FONT}`;
      const ctx = canvas.getContext("2d");
      ctx.font = font;
      const lines = current.split("\n");
      const w = Math.max(...lines.map(s => ctx.measureText(s).width)) + pad * 2;
      const h = px * 1.25 * lines.length + pad * 2 - px * 0.25;
      canvas.width = Math.ceil(w); canvas.height = Math.ceil(h);
      ctx.font = font;
      if (o.bg) {
        ctx.fillStyle = tokens[o.bg] || o.bg;
        const r = 16;
        ctx.beginPath(); ctx.roundRect(0, 0, canvas.width, canvas.height, r); ctx.fill();
      }
      ctx.fillStyle = tokens[o.color || "tx"] || o.color;
      ctx.textBaseline = "top";
      ctx.textAlign = o.align === "left" ? "left" : "center";
      const x = o.align === "left" ? pad : canvas.width / 2;
      lines.forEach((s, i) => ctx.fillText(s, x, pad + i * px * 1.25));
      tex.needsUpdate = true;
      const k = size / (px * 1.25);
      sprite.scale.set(canvas.width * k, canvas.height * k, 1);
    };
    sprite.set = (t) => { if (String(t) !== current) { current = String(t); sprite.redraw(); } };
    sprite.redraw();
    labels.add(sprite);
    return sprite;
  }

  // ---------- выбор объекта щелчком ----------
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  function pick(e) {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    for (const hit of ray.intersectObjects(scene.children, true)) {
      let o = hit.object;
      while (o && !o.userData.pick) o = o.parent;
      if (o && o.visible !== false) return Object.assign(o, { hitPoint: hit.point });
    }
    return null;
  }
  const pickFns = [];
  function onPick(fn) { pickFns.push(fn); }
  renderer.domElement.addEventListener("pointerdown", e => {
    if (!pickFns.length) return;
    const o = pick(e);
    if (o) { e.preventDefault(); pickFns.forEach(fn => fn(o, e)); }
  });
  renderer.domElement.addEventListener("pointermove", e => {
    if (!pickFns.length || e.pointerType === "touch") return;
    renderer.domElement.style.cursor = pick(e) ? "pointer" : "";
  });
  /** Позиция указателя в плоскости z = 0 (для перетаскивания). */
  function pointerOnPlane(e, z = 0) {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const p = new THREE.Vector3();
    ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 0, 1), -z), p);
    return p;
  }

  // ---------- плавные переходы ----------
  const tweens = new Set();
  const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  function getPath(obj, path) {
    const keys = path.split(".");
    const last = keys.pop();
    const owner = keys.reduce((o, k) => o[k], obj);
    return [owner, last];
  }
  function tween(obj, to, ms = 500, delay = 0) {
    return new Promise(resolve => {
      const items = Object.entries(to).map(([path, end]) => {
        const [owner, key] = getPath(obj, path);
        return { owner, key, start: owner[key], end };
      });
      if (reduced || ms <= 0) { items.forEach(i => { i.owner[i.key] = i.end; }); resolve(); return; }
      tweens.add({ items, ms, t: -delay, resolve });
    });
  }

  // ---------- кадр ----------
  const frameFns = [];
  let raf = 0, last = 0, time = 0, visible = true, dead = false;
  function frame(now) {
    raf = 0;
    if (dead) return;
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
    last = now; time += dt;
    for (const tw of [...tweens]) {
      tw.t += dt * 1000;
      if (tw.t < 0) continue;
      const k = Math.min(1, tw.t / tw.ms), e = ease(k);
      for (const i of tw.items) i.owner[i.key] = i.start + (i.end - i.start) * e;
      if (k >= 1) { tweens.delete(tw); tw.resolve(); }
    }
    for (const fn of frameFns) fn(dt, time);
    renderer.render(scene, camera);
    schedule();
  }
  function schedule() {
    if (!raf && visible && !document.hidden && !dead) raf = requestAnimationFrame(frame);
  }
  const io = new IntersectionObserver(es => {
    visible = es[0].isIntersecting;
    if (visible) { last = 0; schedule(); }
  });
  io.observe(wrap);
  const onVis = () => { last = 0; schedule(); };
  document.addEventListener("visibilitychange", onVis);

  // ---------- размер ----------
  function resize() {
    const w = Math.max(1, wrap.clientWidth), h = Math.max(1, wrap.clientHeight);
    renderer.setSize(w, h, false);
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    const aspect = w / h;
    // fit: [ширина, высота] области сцены, которая всегда должна быть видна целиком
    const fit = opts.fit || [view, view];
    if (camera.isOrthographicCamera) {
      const vh = Math.max(fit[1], fit[0] / aspect), vw = vh * aspect;
      Object.assign(camera, { left: -vw / 2, right: vw / 2, top: vh / 2, bottom: -vh / 2 });
    } else {
      camera.aspect = aspect;
      const dir = new THREE.Vector3(...cp).sub(target);
      if (opts.fit) {
        // отодвигаем камеру ровно настолько, чтобы область fit поместилась и по ширине, и по высоте
        const t = Math.tan((camera.fov * Math.PI) / 360);
        const d = Math.max(fit[1] / 2 / t, fit[0] / 2 / (t * aspect)) + (opts.fitDepth || 0);
        camera.position.copy(target).add(dir.normalize().multiplyScalar(d));
      } else {
        const k = aspect < 1.2 ? 1.2 / aspect : 1;
        camera.position.copy(target).add(dir.multiplyScalar(k));
      }
      camera.lookAt(target);
    }
    camera.updateProjectionMatrix();
    resizeFns.forEach(fn => fn(w, h));
    if (!raf) renderer.render(scene, camera);
  }
  const resizeFns = [];
  const ro = new ResizeObserver(resize);
  ro.observe(wrap);

  function dispose() {
    if (dead) return;
    dead = true;
    kits.delete(kit);
    cancelAnimationFrame(raf);
    io.disconnect(); ro.disconnect(); mo.disconnect();
    document.removeEventListener("visibilitychange", onVis);
    scene.traverse(o => {
      o.geometry?.dispose?.();
      const ms = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
      ms.forEach(m => { m.map?.dispose?.(); m.dispose?.(); });
    });
    renderer.dispose();
    renderer.forceContextLoss?.();
    wrap.remove();
  }

  // ---------- заготовки фигур ----------
  /** Скруглённая плитка w × h толщиной d (как карточка или кнопка). */
  function panel(w, h, c = "card-2", d = 0.2, r = Math.min(w, h) * 0.18) {
    const s = new THREE.Shape();
    const x = -w / 2, y = -h / 2;
    s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
    s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
    const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: true, bevelSize: Math.min(0.04, d / 3), bevelThickness: Math.min(0.04, d / 3), bevelSegments: 2, curveSegments: 6 });
    g.translate(0, 0, -d / 2);
    return new THREE.Mesh(g, typeof c === "string" ? mat(c) : c);
  }
  /** Линия по точкам [[x, y, z], ...]. */
  function line(points, c = "line") {
    const g = new THREE.BufferGeometry().setFromPoints(points.map(p => new THREE.Vector3(...p)));
    const m = new THREE.LineBasicMaterial();
    m.color = color(c);
    if (tokens[c]) themed.push([m, c]);
    return new THREE.Line(g, m);
  }
  /** Трубка по точкам — толстая «провод»-линия, которую видно на любом экране. */
  function tube(points, c = "line", radius = 0.04) {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)), false, "catmullrom", 0.01);
    return new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(8, points.length * 8), radius, 8, false), mat(c));
  }
  function add(obj, x = 0, y = 0, z = 0, parent = scene) { obj.position.set(x, y, z); parent.add(obj); return obj; }

  const kit = {
    THREE, scene, camera, renderer, el: wrap, reduced,
    mat, color, label, pick, onPick, pointerOnPlane, tween, panel, line, tube, add,
    onFrame: fn => { frameFns.push(fn); schedule(); },
    onTheme: fn => { themeFns.push(fn); },
    onResize: fn => { resizeFns.push(fn); },
    tokens: () => tokens,
    dispose,
  };
  kits.add(kit);
  resize();
  schedule();
  return kit;
}
