// Значки БитБлокнота — собственные SVG-рисунки в едином стиле.
// Правила стиля: сетка 24×24, поле 2 px по краям, линия 1.75 px, скруглённые концы и углы, без заливки
// (заливка — только у мелких точек). Эмодзи в проекте не используются — только эти значки.

/** Шестерёнка строится программой: 8 зубцов по кругу. */
function gear() {
  const pts = [];
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4;
    for (const [da, r] of [[-0.24, 7], [-0.15, 9.2], [0.15, 9.2], [0.24, 7]]) {
      pts.push(`${(12 + r * Math.cos(a + da)).toFixed(2)} ${(12 + r * Math.sin(a + da)).toFixed(2)}`);
    }
  }
  return `<path d='M${pts.join("L")}Z'/><circle cx='12' cy='12' r='3'/>`;
}

const dot = (x, y, r = 1) => `<circle cx='${x}' cy='${y}' r='${r}' fill='currentColor' stroke='none'/>`;

const P = {
  // ---------- навигация и действия ----------
  "back": "<path d='M14.5 5.5L8 12l6.5 6.5'/>",
  "arrow-left": "<path d='M19 12H5M11 6l-6 6l6 6'/>",
  "arrow-right": "<path d='M5 12h14M13 6l6 6l-6 6'/>",
  "chevron-down": "<path d='M6 9.5l6 6l6-6'/>",
  "chevron-right": "<path d='M9.5 6l6 6l-6 6'/>",
  "chevron-up": "<path d='M6 14.5l6-6l6 6'/>",
  "grip": dot(9, 6, 1.4) + dot(15, 6, 1.4) + dot(9, 12, 1.4) + dot(15, 12, 1.4) + dot(9, 18, 1.4) + dot(15, 18, 1.4),
  "link": "<path d='M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1'/><path d='M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1'/>",
  "cube": "<path d='M12 3l8 4.5v9L12 21l-8-4.5v-9z'/><path d='M4 7.5l8 4.5l8-4.5M12 12v9'/>",
  "check": "<path d='M5 12.5l4.5 4.5L19 7.5'/>",
  "x": "<path d='M6.5 6.5l11 11M17.5 6.5l-11 11'/>",
  "refresh": "<path d='M19.5 12a7.5 7.5 0 0 1-13.1 5M4.5 12a7.5 7.5 0 0 1 13.1-5'/><path d='M17.6 3v4h-4M6.4 21v-4h4'/>",
  "play": "<path d='M8 5.5v13l10.5-6.5z'/>",
  "stop": "<rect x='6' y='6' width='12' height='12' rx='2'/>",
  "logout": "<path d='M10 4H6.5A2.5 2.5 0 0 0 4 6.5v11A2.5 2.5 0 0 0 6.5 20H10M15 8l4 4l-4 4M19 12H9.5'/>",
  "search": "<circle cx='10.5' cy='10.5' r='6.5'/><path d='M15.5 15.5L20 20'/>",
  "pencil": "<path d='M4 20l1.2-4.4L15.8 5a2.1 2.1 0 0 1 3 3L8.4 18.8z'/><path d='M14 6.8l3 3'/>",
  "eraser": "<path d='M9 20h11'/><path d='M4.7 14.3l9.6-9.6a2 2 0 0 1 2.8 0l2.2 2.2a2 2 0 0 1 0 2.8L11 18H8.4l-3.7-3.7z'/><path d='M9 10l5 5'/>",
  "dice": "<rect x='4' y='4' width='16' height='16' rx='3.5'/>" + dot(8.5, 8.5) + dot(15.5, 8.5) + dot(12, 12) + dot(8.5, 15.5) + dot(15.5, 15.5),
  "save": "<path d='M5 4h11l3 3v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1z'/><path d='M8 4v4.5h7V4M8 20v-6h8v6'/>",
  "printer": "<path d='M7 8V4h10v4'/><rect x='3' y='8' width='18' height='8' rx='2'/><path d='M7 13h10v7H7z'/>",

  // ---------- интерфейс ----------
  "notebook": "<rect x='5' y='3' width='14' height='18' rx='2'/><path d='M9 3v18M12.5 8h3M12.5 12h3'/>",
  "book": "<path d='M12 6.5C10.4 5 8 4.5 4 4.5v13.5c4 0 6.4.5 8 2c1.6-1.5 4-2 8-2V4.5c-4 0-6.4.5-8 2zM12 6.5V20'/>",
  "list-check": "<path d='M4 6.5l1.5 1.5L8.5 5M4 12.5l1.5 1.5l3-3M4 18.5l1.5 1.5l3-3M12 6.5h8M12 12.5h8M12 18.5h8'/>",
  "flask": "<path d='M9.5 3h5M10.5 3v6.2l-5 8.6A2.1 2.1 0 0 0 7.3 21h9.4a2.1 2.1 0 0 0 1.8-3.2l-5-8.6V3M7.6 15h8.8'/>",
  "sun": "<circle cx='12' cy='12' r='4'/><path d='M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4'/>",
  "moon": "<path d='M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10z'/>",
  "palette": "<path d='M12 3.5a8.5 8.5 0 0 0 0 17c1 0 1.7-.7 1.7-1.6c0-.5-.2-.8-.5-1.1c-.3-.3-.5-.7-.5-1.1c0-.9.7-1.6 1.6-1.6h2a4.2 4.2 0 0 0 4.2-4.2c0-4-3.8-7.4-8.5-7.4z'/>" + dot(7.6, 11.5, 1.1) + dot(9.6, 7.8, 1.1) + dot(14, 7.4, 1.1) + dot(16.8, 10.4, 1.1),
  "bulb": "<path d='M9.5 18h5M10.5 21h3M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.3 1.1 2.2v.5h5V16c0-.9.4-1.6 1.1-2.2A6 6 0 0 0 12 3z'/>",
  "help": "<circle cx='12' cy='12' r='9'/><path d='M9.6 9.4a2.5 2.5 0 1 1 3.4 2.4c-.6.3-1 .8-1 1.5v.7'/>" + dot(12, 17, 1.05),
  "info": "<circle cx='12' cy='12' r='9'/><path d='M12 11v5.5'/>" + dot(12, 7.8, 1.05),
  "alert": "<path d='M10.3 4.6L2.9 17.5A2 2 0 0 0 4.6 20.5h14.8a2 2 0 0 0 1.7-3L13.7 4.6a2 2 0 0 0-3.4 0z'/><path d='M12 9.5v4'/>" + dot(12, 16.8, 1.05),
  "flame": "<path d='M12 21a6 6 0 0 0 6-6c0-3.6-2.6-5.6-3.6-9c-1.2 1.6-1.6 3.1-1.6 4.6c-1.6-1-2.5-2.8-2.4-5.1C7.4 8.4 6 11.5 6 15a6 6 0 0 0 6 6z'/>",
  "clock": "<circle cx='12' cy='12' r='9'/><path d='M12 7.5V12l3 2'/>",
  "trophy": "<path d='M8 4h8v5.5a4 4 0 0 1-8 0zM8 6H5.5a2.5 2.5 0 0 0 2.6 4M16 6h2.5a2.5 2.5 0 0 1-2.6 4M12 13.5V17M8.5 20.5h7M9.5 17h5v3.5h-5z'/>",
  "dot": "<circle cx='12' cy='12' r='3.5' fill='currentColor' stroke='none'/>",
  "circle": "<circle cx='12' cy='12' r='7'/>",
  "lock": "<rect x='5' y='10.5' width='14' height='10' rx='2.5'/><path d='M8 10.5V7.5a4 4 0 0 1 8 0v3M12 14.5v2'/>",
  "key": "<circle cx='8' cy='15.5' r='4'/><path d='M10.9 12.6L19 4.5M15.5 8l2.5 2.5M17.5 6l2 2'/>",
  "mail": "<rect x='3' y='5.5' width='18' height='13' rx='2.5'/><path d='M3.5 7.5L12 13l8.5-5.5'/>",
  "folder": "<path d='M3.5 7A2 2 0 0 1 5.5 5H9l2 2h7.5a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z'/>",
  "file": "<path d='M13.5 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8.5z'/><path d='M13.5 3v5.5H19'/>",
  "drive": "<rect x='3' y='13' width='18' height='6.5' rx='2'/><path d='M5 13l2.2-7.5h9.6L19 13M7 16.2h4'/>" + dot(16.5, 16.2, 1),
  "user": "<circle cx='12' cy='8' r='4'/><path d='M4.5 20.5a7.5 7.5 0 0 1 15 0'/>",
  "users": "<circle cx='9' cy='8' r='3.5'/><path d='M2.5 20a6.5 6.5 0 0 1 13 0M15.5 4.7a3.5 3.5 0 0 1 0 6.6M18 14.2a6.5 6.5 0 0 1 3.5 5.8'/>",
  "teacher": "<rect x='10' y='3.5' width='11' height='8' rx='1.5'/><circle cx='6' cy='8.5' r='2.5'/><path d='M2 20.5v-2a4 4 0 0 1 8 0v2M9.5 14.5l3.5-2.5'/>",
  "backpack": "<path d='M6 10.5a6 6 0 0 1 12 0V19a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2z'/><path d='M9.5 4.8V4a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v.8M9 14.5h6V18H9z'/>",
  "infinity": "<path d='M12 12c-1.9-2.4-3.4-4-5.5-4a4 4 0 0 0 0 8c2.1 0 3.6-1.6 5.5-4zm0 0c1.9 2.4 3.4 4 5.5 4a4 4 0 0 0 0-8c-2.1 0-3.6 1.6-5.5 4z'/>",
  "chip": "<rect x='6' y='6' width='12' height='12' rx='2'/><rect x='9.5' y='9.5' width='5' height='5' rx='1'/><path d='M9.5 3v3M14.5 3v3M9.5 18v3M14.5 18v3M3 9.5h3M3 14.5h3M18 9.5h3M18 14.5h3'/>",
  "gear": gear(),

  // ---------- достижения ----------
  "flag": "<path d='M5.5 21V4M5.5 4.5h11.5l-2.5 4l2.5 4H5.5'/>",
  "star": "<path d='M12 3.8l2.5 5.2l5.7.8l-4.1 4l1 5.6L12 16.7l-5.1 2.7l1-5.6l-4.1-4l5.7-.8z'/>",
  "target": "<circle cx='12' cy='12' r='9'/><circle cx='12' cy='12' r='5'/>" + dot(12, 12, 1.4),
  "mountain": "<path d='M2.5 19.5L9 8.5l4 6.5l2.5-3.5l6 8z'/>",
  "medal": "<circle cx='12' cy='15' r='5.5'/><path d='M8.8 10.5L6.5 3.5h3.5l2 5M15.2 10.5l2.3-7H14l-2 5'/><path d='M12 12.8v4.4'/>",
  "brain": "<path d='M12 5a3 3 0 0 0-5.5 1.3a3 3 0 0 0-2 5.2a3 3 0 0 0 1 5a3 3 0 0 0 4 2.6A2.5 2.5 0 0 0 12 18zM12 5a3 3 0 0 1 5.5 1.3a3 3 0 0 1 2 5.2a3 3 0 0 1-1 5a3 3 0 0 1-4 2.6A2.5 2.5 0 0 1 12 18zM12 5v13'/>",
  "brush": "<path d='M19 3.5l1.5 1.5l-8.6 8.6l-2.4.9l.9-2.4z'/><path d='M8.3 15.4c-2 0-3.4 1.3-3.4 3.2c0 .8-.7 1.4-1.4 1.4c.9.9 2.3 1.5 3.7 1.5a3.3 3.3 0 0 0 3.3-3.3'/>",
  "headphones": "<path d='M4 16v-4a8 8 0 0 1 16 0v4'/><rect x='3' y='14.5' width='4.5' height='6.5' rx='1.5'/><rect x='16.5' y='14.5' width='4.5' height='6.5' rx='1.5'/>",
  "monitor": "<rect x='3' y='4' width='18' height='12.5' rx='2'/><path d='M8.5 20.5h7M12 16.5v4'/>",
  "compass": "<circle cx='12' cy='4.8' r='1.8'/><path d='M11.2 6.5L6.5 20.5M12.8 6.5l4.7 14M8.2 15.5h7.6'/>",
  "wrench": "<path d='M14.6 5.4a4.5 4.5 0 0 0-5.9 5.9L3.8 16.2a2.1 2.1 0 0 0 3 3l4.9-4.9a4.5 4.5 0 0 0 5.9-5.9l-2.6 2.6l-2.3-.6l-.6-2.3z'/>",

  // ---------- устройства (для уроков и тренажёров) ----------
  "keyboard": "<rect x='2.5' y='6.5' width='19' height='11' rx='2'/><path d='M8 14.5h8'/>" + dot(6.5, 10, .9) + dot(10, 10, .9) + dot(14, 10, .9) + dot(17.5, 10, .9),
  "mouse": "<rect x='6.5' y='3' width='11' height='18' rx='5.5'/><path d='M12 7v3.5'/>",
  "mic": "<rect x='9' y='3' width='6' height='11' rx='3'/><path d='M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M9 21h6'/>",
  "camera": "<path d='M4 8h3l1.7-2.5h6.6L17 8h3a1 1 0 0 1 1 1v9.5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z'/><circle cx='12' cy='13.5' r='3.5'/>",
  "laptop": "<rect x='5' y='4.5' width='14' height='10' rx='1.5'/><path d='M2.5 18.5h19l-1.5-4H4z'/>",
  "phone": "<rect x='7' y='2.5' width='10' height='19' rx='2.5'/><path d='M11 18h2'/>",
  "wifi": "<path d='M8.6 15.4a5 5 0 0 1 6.8 0M5.3 12.1a9.6 9.6 0 0 1 13.4 0M2 8.8a14 14 0 0 1 20 0'/>" + dot(12, 19, 1.2),
  "server": "<rect x='3.5' y='3.5' width='17' height='7.5' rx='2'/><rect x='3.5' y='13' width='17' height='7.5' rx='2'/>" + dot(7.5, 7.25, 1) + dot(7.5, 16.75, 1),
  "volume": "<path d='M4 9.5h3l4.5-4v13l-4.5-4H4z'/><path d='M15.5 9a4 4 0 0 1 0 6M18.3 6.5a8 8 0 0 1 0 11'/>",
  "bolt": "<path d='M13 3L5 13.5h6L10 21l8-10.5h-6z'/>",
  "eye": "<path d='M2.5 12C5 7.5 8.2 5.5 12 5.5s7 2 9.5 6.5c-2.5 4.5-5.7 6.5-9.5 6.5S5 16.5 2.5 12z'/><circle cx='12' cy='12' r='3'/>",
  "ear": "<path d='M7 9a5 5 0 0 1 10 0c0 2.7-1.6 3.8-2.6 4.8c-1 1-1.2 2-1.2 3a3.2 3.2 0 0 1-5.6 2.1'/><path d='M10 9.2a2 2 0 0 1 4 0c0 1-.7 1.5-1.2 2'/>",
  "nose": "<path d='M12.5 3c0 4.5 1.2 7.8 4 11.6c.9 1.3.1 3.4-1.6 3.4H11'/><path d='M8 18.5c1 1.6 2.6 2.5 4.5 2.5'/>",
  "mouth": "<path d='M3 12c2.5-2.3 5-3.1 6.6-2.6L12 10l2.4-.6c1.6-.5 4.1.3 6.6 2.6c-2.5 3.3-5.6 5-9 5s-6.5-1.7-9-5z'/><path d='M3 12h18'/>",
  "hand": "<path d='M8.5 13V6.5a1.5 1.5 0 0 1 3 0V11M11.5 11V4.5a1.5 1.5 0 0 1 3 0V11M14.5 11V6a1.5 1.5 0 0 1 3 0v6M17.5 10a1.5 1.5 0 0 1 3 0v4.5a6.5 6.5 0 0 1-6.5 6.5h-1.2a6 6 0 0 1-4.7-2.3l-3-3.7a1.5 1.5 0 0 1 2.3-2l2.1 2'/>",
};
export const PATHS = P;

/** icon("check") → строка с SVG-значком для вставки в HTML. */
export function icon(name, cls = "") {
  const body = P[name] || P.circle;
  return `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
}

/** Заменяет все <i data-icon="имя"></i> на странице настоящими значками. */
export function fillIcons(root = document) {
  root.querySelectorAll("i[data-icon]").forEach(el => { el.outerHTML = icon(el.dataset.icon, el.className); });
}
