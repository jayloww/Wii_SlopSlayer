# SlopSlayer

A browser-based recreation of the Wii Menu, built as a Creative Coding project. Navigate the familiar channel grid, then launch **Slop Slayer** — a fruit-ninja-style game where you slice AI-generated images for points while avoiding real photos. You have three lives; difficulty ramps over time and the run ends when you run out.

## How to run

This is a static site — open it through a local web server (not `file://`).

**Option 1 — Python (built in on macOS):**

```bash
python3 -m http.server 8000
```

Then open [http://localhost:8000](http://localhost:8000).

**Option 2 — Node:**

```bash
npx serve
```

Use the URL printed in the terminal (usually [http://localhost:3000](http://localhost:3000)).

## Exhibition mode (Windows)

Double-click `start.bat`. It starts a local server and launches Google Chrome in kiosk mode pointed at the app — no address bar, no window chrome. Closing the Chrome window shuts the server down too. Requires Chrome to be installed and Python to be on `PATH`.

Right-clicking (and middle-clicking) inside the app is remapped to act like a left click, and the browser context menu is disabled — visitors can't get at anything but left-click interaction.

## Controls

- **Menu:** Wii-style cursor — click channels to open them, use the splash screen to start the game.
- **Game:** Move the crosshair and click to slash. Slice AI images for score and combos; slicing a real image or missing AI costs a life.
