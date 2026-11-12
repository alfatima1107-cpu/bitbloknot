// Общая подготовка страниц ученика: проверка входа, загрузка курса, шапка с серией дней,
// сохранение прогресса с проверкой новых достижений.
import * as achievements from "./achievements.js";
import { streak } from "./adaptive.js";
import * as course from "./course.js";
import { requireStudent, saveStudent, studentLogout } from "./session.js";
import { badgeToasts, page, toast } from "./ui.js";

export async function studentPage({ back = "home.html" } = {}) {
  const s = requireStudent();
  const c = await course.load();
  const p = s.progress;
  page({ user: s, streak: streak(p).current, home: "home.html", onLogout: studentLogout, back });

  /** После каждого действия ученика: проверить значки, показать новые и сохранить прогресс. */
  function commit() {
    const fresh = achievements.check(p, c);
    badgeToasts(fresh);
    saveStudent(s).catch(ex => toast("alert", "Прогресс не сохранился", ex.message));
    return fresh;
  }
  return { s, p, course: c, commit };
}
