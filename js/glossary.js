// Словарик терминов: важные слова в тексте шага подчёркиваются, нажатие показывает определение.
// Термины лежат в content/glossary.json: { topic, term, stems, def }.
// stems — начала слова («процессор», «оперативн»): так находятся и «процессора», и «оперативной».

const LETTER = "a-zа-яё0-9";

/** Регулярное выражение для термина: начало слова + до 4 букв окончания, не внутри другого слова. */
export function termRegex(entry) {
  const alts = entry.stems.map(s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+"));
  return new RegExp(`(?<![${LETTER}])(?:${alts.join("|")})[а-яё]{0,4}(?![${LETTER}])`, "iu");
}

export function forTopic(list, topic) { return list.filter(x => x.topic === topic); }

/** Какие термины встречаются в тексте: [{ entry, index, length }], по одному на термин, по порядку в тексте. */
export function find(text, entries) {
  const out = [];
  for (const e of entries) {
    const m = termRegex(e).exec(text);
    if (m) out.push({ entry: e, index: m.index, length: m[0].length });
  }
  return out.sort((a, b) => a.index - b.index);
}

/** Поиск по словарику (для панели «Словарик»): по названию и определению. */
export function search(list, query) {
  const q = String(query || "").trim().toLowerCase().replaceAll("ё", "е");
  if (!q) return list;
  const norm = s => s.toLowerCase().replaceAll("ё", "е");
  return list.filter(e => norm(e.term).includes(q) || norm(e.def).includes(q))
    .sort((a, b) => norm(a.term).indexOf(q) === 0 ? -1 : norm(b.term).indexOf(q) === 0 ? 1 : 0);
}

/**
 * Подчёркивает первое вхождение каждого термина в элементе el (только в обычном тексте:
 * не внутри svg, кода, иллюстраций и уже подчёркнутых слов). Возвращает найденные термины.
 */
export function annotate(el, entries) {
  const found = [];
  const left = new Set(entries);
  const walker = el.ownerDocument.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
    acceptNode(n) {
      const p = n.parentElement;
      if (!p || p.closest("svg, code, pre, .illu, .term, button, .formula")) return NodeFilter.FILTER_REJECT;
      return n.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    },
  });
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const node of nodes) {
    if (!left.size) break;
    let text = node.nodeValue, cur = node;
    for (const e of [...left]) {
      const m = termRegex(e).exec(text);
      if (!m) continue;
      const before = cur.splitText(m.index);
      const after = before.splitText(m[0].length);
      const span = el.ownerDocument.createElement("span");
      span.className = "term";
      span.tabIndex = 0;
      span.dataset.term = e.term;
      span.textContent = before.nodeValue;
      before.replaceWith(span);
      left.delete(e);
      found.push(e);
      cur = after; text = after.nodeValue;
    }
  }
  return found;
}
