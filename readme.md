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

## Robotersimulation (neu)
- Datei: `robot_simulator.php`
- Start lokal z. B. mit:
  - `php -S 0.0.0.0:8000`
  - dann `http://localhost:8000/robot_simulator.php` öffnen
- Funktionen:
  - Eingabe der Segment-Abstände `A1→A2` bis `A5→A6` als `dx, dy, dz`
  - Slider für Gelenkwinkel `A1..A6`
  - Tool-Offset ab `A6` in `X/Y` + Rotation `RX/RY/RZ`
  - 2D-Skizze (XY-Projektion) + 3D-Visualisierung (Three.js)
