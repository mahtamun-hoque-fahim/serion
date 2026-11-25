# Changelog

What changed in each version of Serion. Newest first; dates are release dates.

## v1.2.1 — 2026-11-25

### Fixed
- The dashboard's Breaks card no longer cuts off its min/sec dropdown when the
  window is at its 760px minimum. The line now wraps as "Every 45 min of screen
  time," and then "for 1 min", instead of leaving the dropdown alone.

## v1.2.0 — 2026-11-24

### Added
- Display modes, set in the dashboard's new **Pill** card: **Hidden** (the new
  default), **Icon**, or **Full**. Hidden drops the pill while counting
  continues, and the pill still appears for breaks. The choice survives a
  restart.
- A tray icon with **Open Serion** and **Quit Serion**. Quit saves today's
  numbers.

### Fixed
- A tray icon that fails to build no longer stops Serion from starting.
- The pill's height, icon width and intro width come from one `--pill-h` value.

## v1.1.0 — 2026-10-29

### Added
- User-facing README with screenshots, and an MIT license.
- Soft chimes for timers and breaks, and an hourglass icon while a countdown
  runs.
- Expand and settings buttons, placed by whichever screen edge has room.

### Fixed
- Cursor-based click-through, replacing window regions that sometimes painted a
  dark box behind the pill.
- The state icon no longer jumps 1px when its animation ends.
- Only one Serion runs at a time: a second launch opens the dashboard.
- Dashboard styling in the installed app.

## v1.0.0 — 2026-10-27

First release. A pill at the top of the screen shows how long the computer was
actually used today, with per-app time, idle and hold detection, theme colors,
and a dashboard.
