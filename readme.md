# Soccer Manager – Einheitliches UI mit Login

- Start über `index.html` (Name + Passwort). Erst nach Login sind `training.html` und `spieltag.html` zugänglich.
- `app-shell.js` enthält die Login-Logik (hardcoded Passwörter) und blendet die Top-Leiste **nur nach Login** ein.
- Einheitliche Optik über `app-shell.css`.

Struktur:
- `index.html` – Login-Seite
- `training.html` – geschützte Seite
- `spieltag.html` – geschützte Seite
- `app-shell.css` – Design
- `app-shell.js` – Login/Guard/Header
