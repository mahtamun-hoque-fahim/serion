//! Screen-time rules. Pure logic with no OS calls, so every rule is unit tested.
//!
//! The OS-facing loop in `lib.rs` feeds this module three facts once a second:
//! how much wall time passed, how long since the last input, and what window
//! is in front. This module decides what counts.

use serde::Serialize;

/// No cursor movement and no key press for this long means idle.
pub const IDLE_LIMIT_MS: u64 = 5 * 60 * 1000;

/// A tick longer than this means the machine slept or the loop stalled.
/// That gap is never counted.
pub const MAX_TICK_MS: u64 = 5_000;

/// The foreground window, reduced to what the filter needs.
pub struct Window {
    /// Lowercase executable file name, for example "explorer.exe".
    pub exe: String,
    pub title: String,
    pub width: f64,
    pub height: f64,
    pub minimized: bool,
}

/// True when a real application is in front.
///
/// Every rule below comes from probe output (examples/probe.rs), not guesses.
pub fn is_real_app(window: Option<&Window>) -> bool {
    // No foreground window: switching windows, locking, or locked.
    let Some(w) = window else { return false };
    // Hidden helper windows (0x0) and minimized windows are not being used.
    if w.minimized || w.width <= 0.0 || w.height <= 0.0 {
        return false;
    }
    match w.exe.as_str() {
        "lockapp.exe" => false,
        // explorer.exe also draws the desktop and taskbar (empty title), the
        // desktop's classic "Program Manager" window, and the unlock
        // transition. Real File Explorer windows always carry a folder title.
        "explorer.exe" => !matches!(w.title.as_str(), "" | "Program Manager" | "UnlockingWindow"),
        _ => true,
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum State {
    /// A real app is in front and you are not idle: time is counting.
    Active,
    /// No input for IDLE_LIMIT_MS or more.
    Idle,
    /// Desktop, lock screen, minimized everything, or just woke from sleep.
    Away,
}

/// Today's counter.
///
/// Time spent in a real app first goes to `pending`. It moves to `committed`
/// only when an input arrives, because an input proves the gap since the
/// previous input was shorter than the idle limit. If the idle limit is
/// reached first, `pending` is exactly the idle wait and is thrown away.
/// Only `committed` is displayed, so the number can only ever go up.
#[derive(Default)]
pub struct Tracker {
    pub committed_ms: u64,
    pending_ms: u64,
}

impl Tracker {
    pub fn new(committed_ms: u64) -> Self {
        Self { committed_ms, pending_ms: 0 }
    }

    /// `elapsed_ms`: wall time since the previous tick.
    /// `idle_ms`: time since the last cursor move or key press.
    pub fn tick(&mut self, elapsed_ms: u64, idle_ms: u64, real_app: bool) -> State {
        if elapsed_ms > MAX_TICK_MS {
            self.pending_ms = 0;
            return State::Away;
        }
        if idle_ms >= IDLE_LIMIT_MS {
            self.pending_ms = 0;
            return State::Idle;
        }
        if real_app {
            self.pending_ms += elapsed_ms;
        }
        // An input since the previous tick confirms everything pending.
        if idle_ms < elapsed_ms {
            self.committed_ms += self.pending_ms;
            self.pending_ms = 0;
        }
        if real_app { State::Active } else { State::Away }
    }
}

/// "42m" under one hour, "1.5h" from one hour up. Rounds down, never up,
/// so the display never claims time you have not used yet.
pub fn format_duration(ms: u64) -> String {
    let minutes = ms / 60_000;
    if minutes < 60 {
        return format!("{minutes}m");
    }
    let tenths = ms / 360_000;
    if tenths % 10 == 0 {
        format!("{}h", tenths / 10)
    } else {
        format!("{}.{}h", tenths / 10, tenths % 10)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const SEC: u64 = 1_000;
    const MIN: u64 = 60 * SEC;

    fn win(exe: &str, title: &str) -> Window {
        Window { exe: exe.into(), title: title.into(), width: 800.0, height: 600.0, minimized: false }
    }

    #[test]
    fn filter_matches_probe_output() {
        assert!(!is_real_app(None));
        assert!(!is_real_app(Some(&win("explorer.exe", "")))); // desktop, taskbar
        assert!(!is_real_app(Some(&win("explorer.exe", "Program Manager"))));
        assert!(!is_real_app(Some(&win("explorer.exe", "UnlockingWindow"))));
        assert!(!is_real_app(Some(&win("lockapp.exe", "Windows Default Lock Screen"))));
        assert!(is_real_app(Some(&win("explorer.exe", "codes")))); // File Explorer
        assert!(is_real_app(Some(&win("firefox.exe", "New Tab"))));
        assert!(is_real_app(Some(&win("notepad.exe", "Untitled - Notepad"))));

        let mut minimized = win("firefox.exe", "New Tab");
        minimized.minimized = true;
        assert!(!is_real_app(Some(&minimized)));
        let mut hidden = win("explorer.exe", "UnlockingWindow2");
        hidden.width = 0.0;
        assert!(!is_real_app(Some(&hidden)));
    }

    #[test]
    fn steady_input_counts_every_second() {
        let mut t = Tracker::default();
        for _ in 0..90 {
            assert_eq!(t.tick(SEC, 200, true), State::Active);
        }
        assert_eq!(t.committed_ms, 90 * SEC);
    }

    #[test]
    fn reading_without_input_commits_when_input_returns() {
        let mut t = Tracker::default();
        // Four minutes of reading, no input: held as pending, not shown yet.
        for i in 1..=240 {
            t.tick(SEC, i * SEC, true);
        }
        assert_eq!(t.committed_ms, 0);
        // One scroll proves it was not idle: all four minutes appear at once.
        t.tick(SEC, 300, true);
        assert_eq!(t.committed_ms, 241 * SEC);
    }

    #[test]
    fn idle_wait_never_leaks_and_display_never_drops() {
        let mut t = Tracker::default();
        t.tick(SEC, 0, true);
        let before = t.committed_ms;
        let mut shown = before;
        // Walk away for ten minutes with a browser open.
        for i in 1..=600 {
            t.tick(SEC, i * SEC, true);
            assert!(t.committed_ms >= shown, "display dropped");
            shown = t.committed_ms;
        }
        assert_eq!(t.committed_ms, before);
        // Coming back counts from the first input only.
        assert_eq!(t.tick(SEC, 0, true), State::Active);
        assert_eq!(t.committed_ms, before + SEC);
    }

    #[test]
    fn desktop_and_lock_screen_do_not_count() {
        let mut t = Tracker::default();
        for _ in 0..30 {
            assert_eq!(t.tick(SEC, 0, false), State::Away);
        }
        assert_eq!(t.committed_ms, 0);
    }

    #[test]
    fn sleep_gap_is_ignored() {
        let mut t = Tracker::default();
        t.tick(SEC, 30 * SEC, true); // pending before sleep
        assert_eq!(t.tick(8 * 60 * MIN, 0, true), State::Away);
        assert_eq!(t.committed_ms, 0);
        t.tick(SEC, 0, true);
        assert_eq!(t.committed_ms, SEC);
    }

    #[test]
    fn formats_minutes_then_hours() {
        assert_eq!(format_duration(0), "0m");
        assert_eq!(format_duration(42 * MIN + 59 * SEC), "42m");
        assert_eq!(format_duration(59 * MIN), "59m");
        assert_eq!(format_duration(60 * MIN), "1h");
        assert_eq!(format_duration(90 * MIN), "1.5h");
        assert_eq!(format_duration(95 * MIN), "1.5h"); // 1.58h rounds down
        assert_eq!(format_duration(10 * 60 * MIN + 6 * MIN), "10.1h");
    }
}
