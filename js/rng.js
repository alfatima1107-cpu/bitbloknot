// Генератор случайных чисел с «зерном» (seed): одно и то же зерно — одни и те же задачи.
// Это нужно для автотестов. Без зерна используется обычный Math.random.

/** Алгоритм mulberry32: маленький и быстрый генератор псевдослучайных чисел. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Аналог random.Random из Python: random(), randint(a, b), choice, sample, shuffle. */
export class Rng {
  constructor(seed = null) {
    this.random = seed === null ? Math.random : mulberry32(seed);
  }
  /** Целое от a до b включительно. */
  randint(a, b) { return a + Math.floor(this.random() * (b - a + 1)); }
  choice(arr) { return arr[Math.floor(this.random() * arr.length)]; }
  /** Перемешивает массив на месте (алгоритм Фишера — Йетса). */
  shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
  /** k разных элементов из массива. */
  sample(arr, k) { return this.shuffle([...arr]).slice(0, k); }
}
