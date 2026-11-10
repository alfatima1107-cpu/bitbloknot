"""Иконки в виде встроенных SVG — работают без интернета."""
from markupsafe import Markup

PATHS = {
    "notebook": '<path d="M6 4h11a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z"/><path d="M9 4v16M13 8h2M13 12h2"/>',
    "check": '<path d="M5 12l5 5L20 7"/>',
    "x": '<path d="M18 6L6 18M6 6l12 12"/>',
    "arrow-left": '<path d="M5 12h14M5 12l6 6M5 12l6-6"/>',
    "arrow-right": '<path d="M5 12h14M13 18l6-6M13 6l6 6"/>',
    "refresh": '<path d="M20 11A8.1 8.1 0 0 0 4.5 9M4 5v4h4M4 13a8.1 8.1 0 0 0 15.5 2M20 19v-4h-4"/>',
    "play": '<path d="M7 4v16l13-8z"/>',
    "book": '<path d="M3 19a9 9 0 0 1 9 0a9 9 0 0 1 9 0M3 6a9 9 0 0 1 9 0a9 9 0 0 1 9 0M3 6v13M12 6v13M21 6v13"/>',
    "sun": '<circle cx="12" cy="12" r="4"/><path d="M3 12h1M20 12h1M12 3v1M12 20v1M5.6 5.6l.7.7M17.7 17.7l.7.7M5.6 18.4l.7-.7M17.7 6.3l.7-.7"/>',
    "moon": '<path d="M12 3a6 6 0 0 0 9 9a9 9 0 1 1-9-9z"/>',
    "bulb": '<path d="M3 12h1M12 3v1M20 12h1M5.6 5.6l.7.7M18.4 5.6l-.7.7"/><path d="M9 16a5 5 0 1 1 6 0a3.5 3.5 0 0 0-1 3a2 2 0 0 1-4 0a3.5 3.5 0 0 0-1-3M9.7 17h4.6"/>',
    "help": '<circle cx="12" cy="12" r="9"/><path d="M12 17v.01M12 13.5a1.5 1.5 0 0 1 1-1.5a2.6 2.6 0 1 0-3-4"/>',
    "flame": '<path d="M12 12c2-2.96 0-7-1-8c0 3.04-1.77 4.74-3 6c-1.22 1.27-2 3.27-2 5a6 6 0 1 0 12 0c0-1.5-1-3.86-2-5c-1.79 3-2.8 3-4 2z"/>',
    "logout": '<path d="M14 8V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2v-2M9 12h12l-3-3M18 15l3-3"/>',
    "clock": '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>',
    "chevron-down": '<path d="M6 9l6 6l6-6"/>',
    "search": '<circle cx="10" cy="10" r="7"/><path d="M21 21l-6-6"/>',
    "flask": '<path d="M9 3h6M10 9h4M10 3v6L6 18a2 2 0 0 0 2 3h8a2 2 0 0 0 2-3l-4-9V3"/>',
    "pencil": '<path d="M4 20h4L18.5 9.5a2.8 2.8 0 0 0-4-4L4 16v4M13.5 6.5l4 4"/>',
    "list-check": '<path d="M3.5 5.5L5 7l2.5-2.5M3.5 11.5L5 13l2.5-2.5M3.5 17.5L5 19l2.5-2.5M11 6h9M11 12h9M11 18h9"/>',
    "volume": '<path d="M15 8a5 5 0 0 1 0 8M17.7 5a9 9 0 0 1 0 14M6 15H4a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1h2l3.5-4.5A.8.8 0 0 1 11 5v14a.8.8 0 0 1-1.5.5L6 15"/>',
    "stop": '<rect x="6" y="6" width="12" height="12" rx="1"/>',
    "trophy": '<path d="M8 21h8M12 17v4M7 4h10M17 4v8a5 5 0 0 1-10 0V4M5 9a2 2 0 1 1 0-4h2M19 9a2 2 0 1 0 0-4h-2"/>',
    "dot": '<circle cx="12" cy="12" r="4" fill="currentColor"/>',
    "circle": '<circle cx="12" cy="12" r="7"/>',
    "eraser": '<path d="M19 20H8.5l-4.21-4.3a1 1 0 0 1 0-1.41l10-10a1 1 0 0 1 1.41 0l5 5a1 1 0 0 1 0 1.41L11.5 20M18 13.3L11.7 7"/>',
    "dice": '<rect x="4" y="4" width="16" height="16" rx="2"/><circle cx="8.5" cy="8.5" r=".5" fill="currentColor"/><circle cx="15.5" cy="15.5" r=".5" fill="currentColor"/><circle cx="15.5" cy="8.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="15.5" r=".5" fill="currentColor"/>',
    "folder": '<path d="M5 4h4l3 3h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2"/>',
    "file": '<path d="M14 3v4a1 1 0 0 0 1 1h4"/><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z"/>',
}


def icon(name: str, cls: str = "") -> Markup:
    body = PATHS.get(name, PATHS["circle"])
    return Markup(
        f'<svg class="icon {cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" '
        f'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{body}</svg>'
    )
