// В проекте не используются эмодзи — только собственные значки из js/icons.js.
// Этот тест проверяет все файлы сайта, документацию и контент.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const SKIP = new Set([".git", "node_modules", "data", ".claude"]);
const EXT = /\.(html|js|css|json|md|gs)$/;
const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{231A}-\u{23FF}\u{FE0F}]/u;

function* files(dir) {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* files(p);
    else if (EXT.test(name)) yield p;
  }
}

test("ни в одном файле проекта нет эмодзи", () => {
  const bad = [];
  for (const f of files(root)) {
    if (f.endsWith("no-emoji.test.js")) continue;
    const m = readFileSync(f, "utf-8").match(EMOJI);
    if (m) bad.push(`${f.slice(root.length)}: ${m[0]}`);
  }
  assert.deepEqual(bad, []);
});
