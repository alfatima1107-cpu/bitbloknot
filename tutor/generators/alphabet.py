"""Тема 5. Алфавит и двоичный код: N = 2ⁱ, объём сообщения I = K × i."""
import math


def bits_for(n: int) -> int:
    """Сколько бит нужно, чтобы закодировать n вариантов (округление вверх)."""
    return max(1, math.ceil(math.log2(n)))


def generate(level, rng):
    from . import fmt
    kind = rng.choice({1: ["i_from_n", "n_from_i"],
                       2: ["i_from_n_odd", "volume_bits"],
                       3: ["volume_bytes_odd", "n_from_volume"]}[level])

    if kind == "i_from_n":
        i = rng.randint(1, 8)
        n = 2 ** i
        return {
            "text": f"В алфавите <b>{n}</b> символов. Сколько бит нужно, чтобы закодировать один символ?",
            "answer": i, "unit": "бит",
            "hint": "Подбери степень двойки: 2 в какой степени равно мощности алфавита?",
            "solution": [f"N = {n}", f"{n} = 2^{i}, значит, i = {i} бит"],
            "traps": {str(n // 2): "n_vs_i", str(n): "n_vs_i"},
        }
    if kind == "n_from_i":
        i = rng.randint(2, 8)
        n = 2 ** i
        return {
            "text": f"Каждый символ алфавита кодируется <b>{i}</b> битами. Сколько символов может быть в алфавите (максимум)?",
            "answer": n, "unit": "символов",
            "hint": "Сколько разных кодов можно составить из i нулей и единиц? Каждый бит удваивает число вариантов.",
            "solution": [f"N = 2^i = 2^{i} = {n}"],
            "traps": {str(2 * i): "n_vs_i", str(i * i): "n_vs_i"},
        }
    if kind == "i_from_n_odd":
        while True:
            n = rng.randint(3, 200)
            if n & (n - 1):
                break
        i = bits_for(n)
        return {
            "text": f"В алфавите племени Мумба-Юмба <b>{n}</b> символов. Сколько бит нужно на один символ?",
            "answer": i, "unit": "бит",
            "hint": "Найди наименьшую степень двойки, которая не меньше числа символов.",
            "solution": [f"2^{i - 1} = {2 ** (i - 1)} — мало, не хватит на {n} символов",
                         f"2^{i} = {2 ** i} — хватает", f"Значит, i = {i} бит"],
            "traps": {str(i - 1): "no_ceil"},
        }
    if kind == "volume_bits":
        i = rng.randint(1, 6)
        n = 2 ** i
        k = rng.choice([10, 12, 16, 20, 25, 30, 40, 50, 64, 100])
        v = k * i
        return {
            "text": f"Сообщение записано буквами алфавита из <b>{n}</b> символов и содержит <b>{k}</b> символов. "
                    f"Каков информационный объём сообщения в битах?",
            "answer": v, "unit": "бит",
            "hint": "Сначала найди вес одного символа i из N = 2ⁱ, потом умножь на количество символов.",
            "solution": [f"N = {n} = 2^{i}, значит, i = {i} бит", f"I = K × i = {k} × {i} = {v} бит"],
            "traps": {str(k * n): "n_vs_i", str(v // 8) if v % 8 == 0 else "-": "bits_bytes"},
        }
    if kind == "volume_bytes_odd":
        while True:
            n = rng.randint(5, 120)
            if n & (n - 1):
                break
        i = bits_for(n)
        k = rng.choice([8, 16, 24, 32, 40, 48, 64, 80, 96, 128, 200])
        bits = k * i
        if bits % 8:
            k = k * 8 // math.gcd(8, k)  # подгоняем, чтобы делилось на 8
            bits = k * i
        v = bits // 8
        return {
            "text": f"Алфавит содержит <b>{n}</b> символов. Сколько <b>байт</b> займёт сообщение из <b>{k}</b> символов, "
                    f"если каждый символ кодируется минимально возможным одинаковым числом бит?",
            "answer": v, "unit": "байт",
            "hint": "Найди i (округляя вверх), умножь на количество символов и переведи биты в байты.",
            "solution": [f"N = {n} → i = {i} бит (2^{i} = {2 ** i} ≥ {n})",
                         f"I = {k} × {i} = {bits} бит", f"{bits} бит : 8 = {v} байт"],
            "traps": {str(bits): "bits_bytes", str(k * (i - 1) / 8): "no_ceil", str(k * (i - 1)): "no_ceil"},
        }
    # n_from_volume
    i = rng.randint(2, 6)
    k = rng.choice([8, 16, 24, 32, 48, 64, 80, 128])
    bits = k * i
    v = bits // 8
    n = 2 ** i
    return {
        "text": f"Сообщение из <b>{k}</b> символов имеет объём <b>{fmt(v)} байт</b>. "
                f"Какова мощность алфавита (максимальное число символов)?",
        "answer": n, "unit": "символов",
        "hint": "Переведи объём в биты, найди, сколько бит приходится на один символ, а потом N = 2ⁱ.",
        "solution": [f"{v} байт × 8 = {bits} бит", f"i = {bits} : {k} = {i} бит на символ", f"N = 2^{i} = {n}"],
        "traps": {str(i): "n_vs_i", str(2 ** (v // k) if v % k == 0 else -1): "bits_bytes"},
    }
