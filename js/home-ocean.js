// «Пиксельный океан» — фон главной страницы на Three.js.
// Сетка цветных кубиков качается волнами, курсор или палец пускает круговую волну.
// Бережём ресурсы: пауза, когда вкладка скрыта; при «уменьшить движение» — один неподвижный кадр;
// без WebGL или без интернета остаётся обычный фон страницы.
import { loadThree } from "./three-kit.js";

const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

async function start() {
  let THREE;
  try { THREE = await loadThree(); } catch (e) { return; }
  const canvas = document.createElement("canvas");
  canvas.className = "ocean-bg";
  canvas.setAttribute("aria-hidden", "true");
  document.body.prepend(canvas);
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); } catch (e) { canvas.remove(); return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x445566, 1.6));
  const sun = new THREE.DirectionalLight(0xffffff, 1.4); sun.position.set(-6, 14, 8); scene.add(sun);

  const narrow = innerWidth < 700;
  const W = narrow ? 36 : 70, H = narrow ? 30 : 40, S = 0.62;
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(S * 0.86, 1, S * 0.86), new THREE.MeshStandardMaterial({ roughness: 0.45, metalness: 0.05 }), W * H);
  scene.add(mesh);
  const m4 = new THREE.Matrix4(), col = new THREE.Color();
  let palette = [];
  const readPalette = () => { palette = ["--c1", "--c6", "--c5", "--c4", "--c3", "--c2"].map(n => new THREE.Color(css(n) || "#888")); };
  readPalette();
  new MutationObserver(() => { readPalette(); paint(0); }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "data-accent"] });

  const ripples = [];   // { x, z, t }
  const ray = new THREE.Raycaster(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit = new THREE.Vector3(), ndc = new THREE.Vector2();
  let lastRipple = 0;
  addEventListener("pointermove", e => {
    const now = performance.now();
    if (now - lastRipple < 120) return;
    lastRipple = now;
    ndc.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    if (ray.ray.intersectPlane(plane, hit)) { ripples.push({ x: hit.x, z: hit.z, t: clock }); if (ripples.length > 6) ripples.shift(); }
  }, { passive: true });

  function paint(t) {
    let i = 0;
    for (let z = 0; z < H; z++) for (let x = 0; x < W; x++, i++) {
      const px = (x - W / 2) * S, pz = (z - H / 2) * S;
      let h = Math.sin(px * 0.35 + t * 0.9) * 0.45 + Math.sin(pz * 0.42 - t * 0.7) * 0.35 + Math.sin((px + pz) * 0.18 + t * 0.5) * 0.4;
      for (const r of ripples) {
        const age = t - r.t, d = Math.hypot(px - r.x, pz - r.z);
        if (age < 3) h += Math.sin(d * 1.6 - age * 7) * Math.max(0, 1 - age / 3) * Math.max(0, 1 - d / 9) * 0.9;
      }
      const hh = 1.2 + h;
      m4.makeScale(1, Math.max(0.15, hh), 1);
      m4.setPosition(px, hh / 2 - 1, pz);
      mesh.setMatrixAt(i, m4);
      const k = (x / W) * (palette.length - 1), a = Math.floor(k), f = k - a;
      col.copy(palette[a]).lerp(palette[Math.min(a + 1, palette.length - 1)], f).multiplyScalar(0.75 + Math.max(-0.2, Math.min(0.35, h * 0.25)));
      mesh.setColorAt(i, col);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.instanceColor.needsUpdate = true;
  }

  function resize() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.position.set(0, narrow ? 15 : 13, narrow ? 15 : 17);
    camera.lookAt(0, 0, 2);
    camera.updateProjectionMatrix();
  }
  addEventListener("resize", resize);
  resize();

  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let clock = 0, last = 0;
  function frame(now) {
    if (!document.hidden) {
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
      clock += dt;
      scene.rotation.y = Math.sin(clock * 0.05) * 0.12;
      paint(clock);
      renderer.render(scene, camera);
    }
    last = now;
    if (!reduced) requestAnimationFrame(frame);
  }
  document.addEventListener("visibilitychange", () => { last = 0; });
  if (reduced) { paint(0); renderer.render(scene, camera); } else requestAnimationFrame(frame);
}
start();
