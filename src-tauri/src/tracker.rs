//! Screen-time rules. Pure logic with no OS calls, so every rule is unit tested.
//!
//! The OS-facing loop in `lib.rs` feeds this module three facts once a second:
//! how much wall time passed, how long since the last input, and what window
//! is in front. This module decides what counts.

use std::collections::HashMap;

use serde::{Deserialize, Serialize};

/// No cursor movement and no key press for this long means idle.
pub const IDLE_LIMIT_MS: u64 = 5 * 60 * 1000;

/// A tick longer than this means the machine slept or the loop stalled.
/// That gap is never counted.
pub const MAX_TICK_MS: u64 = 5_000;

/// The foreground window, reduced to what the filter needs.
pub struct Window {
    /// Lowercase executable file name, for example "explorer.exe".
    pub exe: String,
    /// Display name for lists, for example "Firefox". Not used by the filter.
    pub name: String,
    pub title: String,
    pub width: f64,
    pub height: f64,
    pub minimized: bool,
    /// The window belongs to Serion itself.
    pub is_self: bool,
}

/// True when a real application is in front.
///
/// Every rule below comes from probe output (examples/probe.rs), not guesses.
pub fn is_real_app(window: Option<&Window>) -> bool {
    // No foreground window: switching windows, locking, or locked.
    let Some(w) = window else { return false };
    // Hidden helper windows (0x0) and minimized windows are not being used.
    // Serion itself never counts: when the last app is minimized, Windows
    // hands focus to the next window in line, which is the always-on-top pill.
    if w.is_self || w.minimized || w.width <= 0.0 || w.height <= 0.0 {
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
    Hold,
}

/// Time spent in one app, keyed elsewhere by its executable name.
#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
pub struct AppTime {
    /// Display name, for example "Firefox".
    pub name: String,
    pub ms: u64,
}

/// The app in front, when it is a real app: (executable, display name).
pub type App<'a> = Option<(&'a str, &'a str)>;

/// Today's counter, in total and per app.
///
/// Time spent in a real app first goes to `pending`. It moves to `committed`
/// only when an input arrives, because an input proves the gap since the
/// previous input was shorter than the idle limit. If the idle limit is
/// reached first, `pending` is exactly the idle wait and is thrown away.
/// Only `committed` is displayed, so the number can only ever go up.
#[derive(Default)]
pub struct Tracker {
    pub committed_ms: u64,
    pub apps: HashMap<String, AppTime>,
    pending: HashMap<String, AppTime>,
}

impl Tracker {
    pub fn new(committed_ms: u64, apps: HashMap<String, AppTime>) -> Self {
        Self { committed_ms, apps, pending: HashMap::new() }
    }

    /// `elapsed_ms`: wall time since the previous tick.
    /// `idle_ms`: time since the last cursor move or key press.
    pub fn tick(&mut self, elapsed_ms: u64, idle_ms: u64, app: App) -> State {
        if elapsed_ms > MAX_TICK_MS {
            self.pending.clear();
            return State::Hold;
        }
        if idle_ms >= IDLE_LIMIT_MS {
            self.pending.clear();
            return State::Idle;
        }
        if let Some((exe, name)) = app {
            let entry = self.pending.entry(exe.to_string()).or_default();
            entry.name = name.to_string();
            entry.ms += elapsed_ms;
        }
        // An input since the previous tick confirms everything pending.
        if idle_ms < elapsed_ms {
            for (exe, time) in self.pending.drain() {
                self.committed_ms += time.ms;
                let entry = self.apps.entry(exe).or_default();
                entry.name = time.name;
                entry.ms += time.ms;
            }
        }
        if app.is_some() { State::Active } else { State::Hold }
    }

    /// The `n` apps with the most time today, most used first.
    pub fn top(&self, n: usize) -> Vec<AppTime> {
        let mut apps: Vec<AppTime> = self.apps.values().cloned().collect();
        apps.sort_by(|a, b| b.ms.cmp(&a.ms).then_with(|| a.name.cmp(&b.name)));
        apps.truncate(n);
        apps
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
    const FX: App = Some(("firefox.exe", "Firefox"));
    const CODE: App = Some(("code.exe", "Visual Studio Code"));

    #[test]
    fn time_is_split_per_app_and_sums_to_total() {
        let mut t = Tracker::default();
        for _ in 0..30 {
            t.tick(SEC, 0, FX);
        }
        for _ in 0..90 {
            t.tick(SEC, 0, CODE);
        }
        t.tick(SEC, 0, None);
        assert_eq!(t.committed_ms, 120 * SEC);
        let top = t.top(5);
        assert_eq!(top[0], AppTime { name: "Visual Studio Code".into(), ms: 90 * SEC });
        assert_eq!(top[1], AppTime { name: "Firefox".into(), ms: 30 * SEC });
        assert_eq!(t.top(1).len(), 1);
    }

    #[test]
    fn idle_wait_is_dropped_per_app_too() {
        let mut t = Tracker::default();
        t.tick(SEC, 0, FX);
        // Reading in Firefox, then walking away: nothing pending survives.
        for i in 1..=300 {
            t.tick(SEC, i * SEC, FX);
        }
        assert_eq!(t.apps["firefox.exe"].ms, SEC);
    }

    fn win(exe: &str, title: &str) -> Window {
        Window {
            exe: exe.into(),
            name: exe.into(),
            title: title.into(),
            width: 800.0,
            height: 600.0,
            minimized: false,
            is_self: false,
        }
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
        // Focus handed to the pill after the last app was minimized.
        let mut pill = win("serion.exe", "serion");
        pill.is_self = true;
        assert!(!is_real_app(Some(&pill)));
        let mut hidden = win("explorer.exe", "UnlockingWindow2");
        hidden.width = 0.0;
        assert!(!is_real_app(Some(&hidden)));
    }

    #[test]
    fn steady_input_counts_every_second() {
        let mut t = Tracker::default();
        for _ in 0..90 {
            assert_eq!(t.tick(SEC, 200, FX), State::Active);
        }
        assert_eq!(t.committed_ms, 90 * SEC);
    }

    #[test]
    fn reading_without_input_commits_when_input_returns() {
        let mut t = Tracker::default();
        // Four minutes of reading, no input: held as pending, not shown yet.
        for i in 1..=240 {
            t.tick(SEC, i * SEC, FX);
        }
        assert_eq!(t.committed_ms, 0);
        // One scroll proves it was not idle: all four minutes appear at once.
        t.tick(SEC, 300, FX);
        assert_eq!(t.committed_ms, 241 * SEC);
    }

    #[test]
    fn idle_wait_never_leaks_and_display_never_drops() {
        let mut t = Tracker::default();
        t.tick(SEC, 0, FX);
        let before = t.committed_ms;
        let mut shown = before;
        // Walk away for ten minutes with a browser open.
        for i in 1..=600 {
            t.tick(SEC, i * SEC, FX);
            assert!(t.committed_ms >= shown, "display dropped");
            shown = t.committed_ms;
        }
        assert_eq!(t.committed_ms, before);
        // Coming back counts from the first input only.
        assert_eq!(t.tick(SEC, 0, FX), State::Active);
        assert_eq!(t.committed_ms, before + SEC);
    }

    #[test]
    fn desktop_and_lock_screen_do_not_count() {
        let mut t = Tracker::default();
        for _ in 0..30 {
            assert_eq!(t.tick(SEC, 0, None), State::Hold);
        }
        assert_eq!(t.committed_ms, 0);
    }

    #[test]
    fn sleep_gap_is_ignored() {
        let mut t = Tracker::default();
        t.tick(SEC, 30 * SEC, FX); // pending before sleep
        assert_eq!(t.tick(8 * 60 * MIN, 0, FX), State::Hold);
        assert_eq!(t.committed_ms, 0);
        t.tick(SEC, 0, FX);
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
