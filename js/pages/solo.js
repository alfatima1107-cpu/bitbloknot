// Самостоятельное обучение: ученик вводит имя и сразу учится. Прогресс — в этом браузере (js/session.js).
import { soloCard, soloExport, soloImport, soloStart } from "../session.js";
import { $, esc, icon, page } from "../ui.js";
import { overview } from "../adaptive.js";
import { load } from "../course.js";
import { normalize } from "../progress.js";

page({ back: "index.html" });

const old = soloCard();
if (old) {
  // уже учился на этом компьютере — предлагаем продолжить
  const course = await load();
  const pct = overview(normalize(old.progress), course).coursePct;
  $("#continue").innerHTML = `<button class="card" type="button" id="go-on" style="width:100%;text-align:left;cursor:pointer;margin-bottom:14px;display:flex;gap:14px;align-items:center;font:inherit;color:inherit">
    <span style="font-size:1.6rem;color:var(--ac)">${icon("user")}</span>
    <span style="flex:1"><b>Продолжить как ${esc(old.name)}</b><br><span class="small muted">пройдено ${pct}% курса</span></span>${icon("arrow-right")}</button>
    <div class="center small muted" style="margin:-4px 0 10px">или начни под другим именем — прогресс сохранится</div>`;
  $("#go-on").onclick = () => { soloStart(old.name); location.href = "home.html"; };
  $("#name").value = old.name;
}

$("#form").addEventListener("submit", e => {
  e.preventDefault();
  const name = $("#name").value.trim();
  if (!name) { $("#error").textContent = "Напиши своё имя"; $("#error").classList.remove("hidden"); $("#name").focus(); return; }
  soloStart(name);
  location.href = "home.html";
});
$("#name").addEventListener("input", () => $("#error").classList.add("hidden"));

$("#export").onclick = () => {
  if (!soloCard()) { $("#import-error").textContent = "Пока нечего сохранять — сначала начни учиться"; $("#import-error").classList.remove("hidden"); return; }
  const blob = new Blob([soloExport()], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `bitbloknot-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
};

$("#import-file").onchange = async e => {
  const f = e.target.files[0];
  if (!f) return;
  try {
    soloImport(await f.text());
    location.href = "home.html";
  } catch (ex) {
    $("#import-error").textContent = ex.message;
    $("#import-error").classList.remove("hidden");
  }
};
