// Содержание курса: список тем и уроки.
// Уроки лежат в папке content/ в виде JSON-файлов, поэтому их можно дополнять, не трогая программный код.

export const SECTIONS = {
  1: "Цифровая грамотность",
  2: "Теоретические основы информатики",
  3: "Информационные технологии",
};

/** Имена файлов уроков: тема 8 → content/08_image.json. */
export const LESSON_FILES = {
  1: "01_computer", 2: "02_files", 3: "03_network", 4: "04_information", 5: "05_alphabet", 6: "06_units",
  7: "07_text", 8: "08_image", 9: "09_sound", 10: "10_documents", 11: "11_graphics", 12: "12_presentations",
};

/**
 * Тема состоит из нескольких уроков: { lessons: [{ title, steps: [...] }, ...], cheatsheet, test_bank }.
 * Для «умного репетитора» все шаги темы выстраиваются в одну цепочку lesson.steps —
 * у каждого шага есть номер урока (lesson) и номер шага внутри урока (lessonStep).
 * Так прогресс хранится просто: «в теме 8 пройдены шаги 0, 1, 2…».
 */
export function prepare(json) {
  if (json.prepared) return json;
  const lessons = json.lessons || [{ title: "Урок", steps: json.steps || [] }];
  const steps = [];
  lessons.forEach((l, li) => {
    l.start = steps.length;
    l.steps.forEach((st, si) => {
      st.title = String(st.title || "").replace(/^Шаг \d+\.\s*/, "");   // номер шага рисует страница
      steps.push(Object.assign(st, { lesson: li, lessonStep: si }));
    });
  });
  return Object.assign(json, { lessons, steps, cheatsheet: json.cheatsheet || "", test_bank: json.test_bank || [], prepared: true });
}

const cache = {};
async function getJson(path) {
  if (!cache[path]) {
    // no-cache: браузер каждый раз сверяется с сервером, поэтому новые уроки видны сразу после обновления сайта
    cache[path] = fetch(path, { cache: "no-cache" }).then(r => {
      if (!r.ok) throw new Error(`Не удалось загрузить ${path}`);
      return r.json();
    });
  }
  return cache[path];
}

export function topics() { return getJson("content/topics.json"); }

export async function lesson(num) {
  const f = LESSON_FILES[num];
  return prepare(f ? await getJson(`content/${f}.json`) : {});
}

/** Весь курс сразу: { topics, lessons: { 1: {...}, 2: {...} } } — нужен «умному репетитору». */
export async function load() {
  const ts = await topics();
  const ls = await Promise.all(ts.map(t => lesson(t.num)));
  return { topics: ts, lessons: Object.fromEntries(ts.map((t, i) => [t.num, ls[i]])) };
}

export function bySection(ts) {
  return Object.entries(SECTIONS).map(([s, name]) => [Number(s), name, ts.filter(t => t.section === Number(s))]);
}
