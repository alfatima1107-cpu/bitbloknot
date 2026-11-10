"""Тема 9. Кодирование звука: I = частота × разрядность × время × число каналов."""


def generate(level, rng):
    from . import fmt
    if level == 1:
        f_khz = rng.choice([8, 16, 32])
        bits = 8
        t = rng.choice([1, 2, 3, 5, 10])
        v = f_khz * 1000 * bits * t // 8
        return {
            "text": f"Звук записан в режиме <b>моно</b> с частотой дискретизации <b>{f_khz} кГц</b> "
                    f"и разрядностью <b>{bits} бит</b>. Длительность — <b>{t} с</b>. Каков объём файла в <b>байтах</b>?",
            "answer": v, "unit": "байт",
            "hint": "Объём = частота (замеров в секунду) × разрядность × время × каналы. 1 кГц = 1000 Гц.",
            "solution": [f"{f_khz} кГц = {fmt(f_khz * 1000)} замеров в секунду",
                         f"I = {fmt(f_khz * 1000)} × {bits} × {t} × 1 = {fmt(v * 8)} бит",
                         f"{fmt(v * 8)} бит : 8 = {fmt(v)} байт"],
            "traps": {str(v * 8): "bits_bytes", str(f_khz * bits * t // 8): "khz",
                      str(f_khz * bits * t): "khz"},
        }
    if level == 2:
        f_khz = rng.choice([8, 16, 32, 48])
        bits = rng.choice([8, 16])
        t = rng.choice([2, 4, 5, 10])
        ch = 2
        v = f_khz * 1000 * bits * t * ch // 8
        return {
            "text": f"Производится <b>стерео</b>запись с частотой <b>{f_khz} кГц</b>, разрядность <b>{bits} бит</b>, "
                    f"длительность <b>{t} с</b>. Каков объём файла в <b>байтах</b>?",
            "answer": v, "unit": "байт",
            "hint": "В стерео два канала — объём в 2 раза больше, чем в моно.",
            "solution": [f"{f_khz} кГц = {fmt(f_khz * 1000)} Гц, стерео = 2 канала",
                         f"I = {fmt(f_khz * 1000)} × {bits} × {t} × 2 = {fmt(v * 8)} бит",
                         f"{fmt(v * 8)} бит : 8 = {fmt(v)} байт"],
            "traps": {str(v // 2): "stereo", str(v * 8): "bits_bytes", str(v * 8 // 1000): "khz"},
        }
    # level 3
    if rng.random() < 0.5:
        f_khz = rng.choice([22.05, 44.1, 48])
        bits = 16
        minutes = rng.choice([1, 2, 3, 5])
        ch = rng.choice([1, 2])
        f = round(f_khz * 1000)
        b = f * bits * minutes * 60 * ch / 8
        mb = b / 1024 / 1024
        mode = "стерео" if ch == 2 else "моно"
        traps = {str(mb * 8): "bits_bytes", str(mb / 60): "minutes", str(b / 1000 / 1000): "kilo_1000"}
        if ch == 2:
            traps[str(mb / 2)] = "stereo"
        return {
            "text": f"Песня длится <b>{minutes} мин</b> и записана в режиме <b>{mode}</b>, "
                    f"частота <b>{fmt(f_khz)} кГц</b>, разрядность <b>{bits} бит</b>. "
                    f"Сколько <b>Мбайт</b> займёт файл? Округли до целых.",
            "answer": round(mb), "exact": mb, "tolerance": 0.51, "unit": "Мбайт",
            "hint": "Переведи минуты в секунды, перемножь всё и переводи: бит → байт → Кбайт → Мбайт.",
            "solution": [f"{minutes} мин = {minutes * 60} с; {fmt(f_khz)} кГц = {fmt(f)} Гц; каналов: {ch}",
                         f"I = {fmt(f)} × {bits} × {minutes * 60} × {ch} = {fmt(round(b * 8))} бит",
                         f"= {fmt(round(b))} байт = {fmt(round(b / 1024, 1))} Кбайт ≈ {fmt(round(mb, 2))} Мбайт",
                         f"Ответ: ≈ {round(mb)} Мбайт"],
            "traps": traps,
        }
    f_khz = rng.choice([8, 16, 32])
    bits = rng.choice([8, 16])
    t = rng.choice([5, 10, 20, 30])
    v = f_khz * 1000 * bits * t // 8
    return {
        "text": f"Звуковой файл <b>моно</b> с частотой <b>{f_khz} кГц</b> и разрядностью <b>{bits} бит</b> "
                f"занимает <b>{fmt(v)} байт</b>. Сколько <b>секунд</b> длится запись?",
        "answer": t, "unit": "с",
        "hint": "Время = объём в битах : (частота × разрядность × каналы).",
        "solution": [f"{fmt(v)} байт × 8 = {fmt(v * 8)} бит",
                     f"t = {fmt(v * 8)} : ({fmt(f_khz * 1000)} × {bits}) = {t} с"],
        "traps": {str(t / 8): "bits_bytes", str(t * 1000): "khz"},
    }
