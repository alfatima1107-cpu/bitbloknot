// Тема 2. Файлы и папки: типы файлов по расширению, полные пути, маски * и ?.

export const TYPES = {
  "текстовый документ": ["docx", "txt", "odt", "rtf"],
  "рисунок": ["png", "jpg", "bmp", "gif"],
  "звук": ["mp3", "wav", "ogg"],
  "видео": ["mp4", "avi", "mkv"],
  "программа": ["exe"],
  "архив": ["zip", "rar", "7z"],
};
const NAMES = ["доклад", "отчёт", "кот", "песня", "фото", "игра", "контрольная", "план", "проект", "задачи"];
const FOLDERS = ["Школа", "Информатика", "Физика", "Музыка", "Фото", "Игры", "Документы", "Проекты", "Тесты", "Лето"];
const DISKS = ["C", "D"];

export const MASK_FILES = ["cat.txt", "cats.txt", "car.doc", "bat.txt", "act.txt", "cap.txt", "map.doc", "mat.txt",
  "data.txt", "date.doc", "art.png", "start.txt", "a.txt", "dart.txt", "cart.doc", "card.txt"];

/** Подходит ли имя файла под маску: * — любое число символов, ? — ровно один. */
export function match(name, mask) {
  const body = mask.toLowerCase()
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*")
    .replace(/\?/g, ".");
  return new RegExp("^" + body + "$", "s").test(name.toLowerCase());
}

export function generate(level, rng) {
  if (level === 1) {
    const kinds = Object.keys(TYPES);
    const kind = rng.choice(kinds);
    const ext = rng.choice(TYPES[kind]);
    const name = `${rng.choice(NAMES)}.${ext}`;
    const options = rng.shuffle([kind, ...rng.sample(kinds.filter(k => k !== kind), 3)]);
    return {
      kind: "choice",
      text: `Что, скорее всего, хранится в файле <code>${name}</code>?`,
      options, answer: kind,
      hint: "Тип файла подсказывает расширение — часть имени после последней точки.",
      solution: [`Расширение файла — .${ext}`, `.${ext} — это ${kind}`],
    };
  }
  if (level === 2) {
    const disk = rng.choice(DISKS);
    const depth = rng.choice([2, 3]);
    const folders = rng.sample(FOLDERS, depth);
    const fname = `${rng.choice(NAMES)}.${rng.choice(["txt", "docx", "png", "mp3"])}`;
    const path = disk + ":\\" + [...folders, fname].join("\\");
    let desc = `на диске <b>${disk}:</b>`;
    for (const f of folders) desc += ` → в папке <b>${f}</b>`;
    return {
      kind: "text",
      text: `Файл <code>${fname}</code> лежит ${desc}. Запиши <b>полный путь</b> к файлу.`,
      answer: path,
      placeholder: "Например, C:\\Папка\\файл.txt",
      hint: "Полный путь: диск, двоеточие, обратная косая черта, затем папки от внешней к внутренней " +
            "и в конце имя файла.",
      solution: [`Начинаем с диска: ${disk}:\\`,
                 "Дальше папки по порядку: " + folders.join(" → "),
                 `В конце имя файла: ${fname}`, `Ответ: ${path}`],
      traps: {
        [path.replaceAll("\\", "/")]: "path",
        [[...folders, fname].join("\\")]: "path",
        [disk + ":\\" + [...folders].reverse().concat(fname).join("\\")]: "path",
      },
    };
  }
  // level 3
  if (rng.random() < 0.5) {
    const masks = ["?at.txt", "c*.txt", "?a*.txt", "*t.doc", "??t.txt", "*ar*.*", "c?t*.txt", "*.doc"];
    let mask, yes, no, near;
    for (;;) {
      mask = rng.choice(masks);
      yes = MASK_FILES.filter(f => match(f, mask));
      no = MASK_FILES.filter(f => !match(f, mask));
      const starTwin = mask.replaceAll("?", "*");
      near = no.filter(f => match(f, starTwin));
      if (yes.length && no.length >= 3) break;
    }
    const right = rng.choice(yes);
    let wrong = rng.sample(near, Math.min(1, near.length));
    wrong = wrong.concat(rng.sample(no.filter(f => !wrong.includes(f)), 3 - wrong.length));
    const options = rng.shuffle([right, ...wrong]);
    const traps = {};
    for (const w of near) if (options.includes(w)) traps[w] = "mask";
    return {
      kind: "choice",
      text: `Какой из файлов подходит под маску <code>${mask}</code>?`,
      options, answer: right,
      hint: "Звёздочка * — любое количество любых символов (даже ни одного), знак ? — ровно один любой символ.",
      solution: [
        `Маска ${mask}: ` + [...mask].filter(c => c === "*" || c === "?")
          .map(c => (c === "?" ? "? — один символ" : "* — сколько угодно символов")).join(", "),
        `Подходит ${right}`,
        ...wrong.map(w => `${w} — не подходит`),
      ],
      traps,
    };
  }
  const disk = rng.choice(DISKS);
  const [a, b, c] = rng.sample(FOLDERS, 3);
  const fname = `${rng.choice(NAMES)}.txt`;
  const old = `${disk}:\\${a}\\${b}\\${fname}`;
  const nw = `${disk}:\\${c}\\${fname}`;
  return {
    kind: "text",
    text: `Файл <code>${old}</code> переместили в папку <b>${c}</b>, которая находится прямо на диске ` +
          `<b>${disk}:</b>. Каким стал полный путь к файлу?`,
    answer: nw,
    placeholder: "Например, C:\\Папка\\файл.txt",
    hint: "При перемещении имя файла не меняется, меняются только папки в пути.",
    solution: [`Новая папка ${c} лежит прямо на диске ${disk}:`, `Имя файла то же: ${fname}`, `Ответ: ${nw}`],
    traps: {
      [`${disk}:\\${a}\\${b}\\${c}\\${fname}`]: "path",
      [`${disk}:\\${a}\\${c}\\${fname}`]: "path",
      [nw.replaceAll("\\", "/")]: "path",
    },
  };
}
