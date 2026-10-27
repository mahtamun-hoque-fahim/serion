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
    /// The pill or the flash (Serion's dashboard counts like any app).
    pub is_self: bool,
    /// Covers its whole monitor exactly: video, game, F11.
    pub fullscreen: bool,
    /// Which monitor it is on (an OS handle, compared only for equality).
    pub monitor: isize,
}

/// What the focused window means for counting.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Front {
    /// A real app: it gets the time.
    App,
    /// Start menu, search, Action Center, Alt+Tab, Task View: hold.
    Shell,
    /// Desktop, taskbar, the pill, a minimized window: the topmost open app
    /// gets the time, and hold only once no app window is open.
    Desktop,
    /// Lock screen, UAC prompt, or no window at all: hold.
    Locked,
}

const SHELL_SURFACES: [&str; 4] =
    ["searchhost.exe", "searchapp.exe", "startmenuexperiencehost.exe", "shellexperiencehost.exe"];

/// Overlays drawn over whatever you are doing (Game Bar, the screenshot
/// overlay): the app underneath keeps the time.
const OVERLAYS: [&str; 3] = ["gamebar.exe", "gamebarftserver.exe", "screenclippinghost.exe"];

pub fn classify(window: Option<&Window>) -> Front {
    let Some(w) = window else { return Front::Locked };
    match w.exe.as_str() {
        "lockapp.exe" => Front::Locked,
        exe if SHELL_SURFACES.contains(&exe) => Front::Shell,
        exe if OVERLAYS.contains(&exe) => Front::Desktop,
        "explorer.exe" if matches!(w.title.as_str(), "Task Switching" | "Task View") => Front::Shell,
        "explorer.exe" if w.title == "UnlockingWindow" => Front::Locked,
        _ if is_real_app(Some(w)) => Front::App,
        _ => Front::Desktop,
    }
}

/// The open app windows in a window list, topmost first.
pub fn open_apps(windows: &[Window]) -> Vec<&Window> {
    windows.iter().filter(|w| classify(Some(w)) == Front::App).collect()
}

/// Who gets this second. The focused app; with the desktop, taskbar or pill
/// focused, the topmost open app, so minimizing one of several apps never
/// means hold. Hold only when the last app window goes (N from 1 to 0).
pub fn credit<'a>(front: Option<&'a Window>, open: &[&'a Window]) -> Option<&'a Window> {
    match classify(front) {
        Front::App => front,
        Front::Desktop => open.first().copied(),
        Front::Shell | Front::Locked => None,
    }
}

/// With "count apps on other screens" on: the topmost open app on each other
/// monitor also gets per-app time (the total still counts once).
pub fn other_screens<'a>(main: &Window, open: &[&'a Window]) -> Vec<&'a Window> {
    let mut seen = vec![main.monitor];
    open.iter()
        .filter(|w| {
            let new = !seen.contains(&w.monitor);
            seen.push(w.monitor);
            new
        })
        .copied()
        .collect()
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
    pending_ms: u64,
    pending_apps: HashMap<String, AppTime>,
}

impl Tracker {
    pub fn new(committed_ms: u64, apps: HashMap<String, AppTime>) -> Self {
        Self { committed_ms, apps, ..Self::default() }
    }

    /// `elapsed_ms`: steady-clock time since the previous tick.
    /// `idle_ms`: time since the last input (0 while the display is kept awake).
    /// `idle_limit_ms`: IDLE_LIMIT_MS, or longer in reading mode.
    /// `app`: who gets this second; `extras`: apps on other screens, which
    /// get per-app time without counting the total twice.
    pub fn tick(&mut self, elapsed_ms: u64, idle_ms: u64, idle_limit_ms: u64, app: App, extras: &[(&str, &str)]) -> State {
        if elapsed_ms > MAX_TICK_MS {
            self.drop_pending();
            return State::Hold;
        }
        if idle_ms >= idle_limit_ms {
            self.drop_pending();
            return State::Idle;
        }
        if let Some(main) = app {
            self.pending_ms += elapsed_ms;
            for (exe, name) in std::iter::once(main).chain(extras.iter().copied()) {
                let entry = self.pending_apps.entry(exe.to_string()).or_default();
                entry.name = name.to_string();
                entry.ms += elapsed_ms;
            }
        }
        // An input since the previous tick confirms everything pending.
        if idle_ms < elapsed_ms {
            self.commit();
        }
        if app.is_some() { State::Active } else { State::Hold }
    }

    /// Move pending time into today's totals (also used at midnight, so
    /// active time before 00:00 lands on the old day).
    pub fn commit(&mut self) {
        self.committed_ms += std::mem::take(&mut self.pending_ms);
        for (exe, time) in self.pending_apps.drain() {
            let entry = self.apps.entry(exe).or_default();
            entry.name = time.name;
            entry.ms += time.ms;
        }
    }

    fn drop_pending(&mut self) {
        self.pending_ms = 0;
        self.pending_apps.clear();
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
    const LIMIT: u64 = IDLE_LIMIT_MS;

    fn on(exe: &str, title: &str, monitor: isize) -> Window {
        Window { monitor, ..win(exe, title) }
    }

    #[test]
    fn minimizing_one_of_several_apps_keeps_counting() {
        let open_list = [on("code.exe", "main.rs", 1), on("firefox.exe", "Docs", 1)];
        let open = open_apps(&open_list);
        // Focus fell to the pill or the desktop after a minimize: the topmost open app gets it.
        let pill = Window { is_self: true, ..win("serion.exe", "serion") };
        assert_eq!(credit(Some(&pill), &open).map(|w| w.exe.as_str()), Some("code.exe"));
        let desktop = win("explorer.exe", "");
        assert_eq!(credit(Some(&desktop), &open).map(|w| w.exe.as_str()), Some("code.exe"));
        let mut minimized = win("notepad.exe", "Untitled");
        minimized.minimized = true;
        assert_eq!(credit(Some(&minimized), &open).map(|w| w.exe.as_str()), Some("code.exe"));
    }

    #[test]
    fn hold_only_when_the_last_app_window_goes() {
        let desktop = win("explorer.exe", "");
        assert!(credit(Some(&desktop), &[]).is_none());
        assert!(credit(None, &[]).is_none()); // locked, UAC, mid-switch
    }

    #[test]
    fn start_menu_search_and_alt_tab_are_hold_even_with_apps_open() {
        let open_list = [win("code.exe", "main.rs")];
        let open = open_apps(&open_list);
        for front in [win("searchhost.exe", "Search"), win("startmenuexperiencehost.exe", "Start"), win("explorer.exe", "Task Switching")] {
            assert_eq!(classify(Some(&front)), Front::Shell);
            assert!(credit(Some(&front), &open).is_none());
        }
        // Shell surfaces never count as open apps either.
        assert!(open_apps(&[win("searchhost.exe", "Search")]).is_empty());
    }

    #[test]
    fn game_bar_and_screenshot_overlays_credit_the_app_underneath() {
        let open_list = [win("code.exe", "main.rs")];
        let open = open_apps(&open_list);
        for overlay in [win("gamebar.exe", "Game Bar"), win("screenclippinghost.exe", "Screen clipping")] {
            assert_eq!(credit(Some(&overlay), &open).map(|w| w.exe.as_str()), Some("code.exe"));
        }
        assert!(open_apps(&[win("gamebar.exe", "Game Bar")]).is_empty());
    }

    #[test]
    fn serion_dashboard_counts_but_the_pill_does_not() {
        assert_eq!(classify(Some(&win("serion.exe", "Serion"))), Front::App);
        let pill = Window { is_self: true, ..win("serion.exe", "serion") };
        assert_eq!(classify(Some(&pill)), Front::Desktop);
    }

    #[test]
    fn other_screens_get_per_app_time_but_the_total_counts_once() {
        let list = [on("code.exe", "a", 1), on("vlc.exe", "movie", 2), on("slack.exe", "chat", 2)];
        let open = open_apps(&list);
        let extras: Vec<&str> = other_screens(open[0], &open).iter().map(|w| w.exe.as_str()).collect();
        assert_eq!(extras, ["vlc.exe"]); // topmost on monitor 2 only

        let mut t = Tracker::default();
        t.tick(SEC, 0, LIMIT, CODE, &[("vlc.exe", "VLC")]);
        assert_eq!(t.committed_ms, SEC);
        assert_eq!((t.apps["code.exe"].ms, t.apps["vlc.exe"].ms), (SEC, SEC));
    }

    #[test]
    fn a_longer_idle_limit_keeps_a_long_read_counting() {
        let mut t = Tracker::default();
        assert_eq!(t.tick(SEC, 10 * MIN, 20 * MIN, FX, &[]), State::Active);
        assert_eq!(t.tick(SEC, 10 * MIN, LIMIT, FX, &[]), State::Idle);
    }

    #[test]
    fn midnight_commit_keeps_pending_time_on_the_old_day() {
        let mut t = Tracker::default();
        t.tick(SEC, 2 * SEC, LIMIT, FX, &[]); // pending, no input this tick
        assert_eq!(t.committed_ms, 0);
        t.commit();
        assert_eq!(t.committed_ms, SEC);
    }

    #[test]
    fn time_is_split_per_app_and_sums_to_total() {
        let mut t = Tracker::default();
        for _ in 0..30 {
            t.tick(SEC, 0, LIMIT, FX, &[]);
        }
        for _ in 0..90 {
            t.tick(SEC, 0, LIMIT, CODE, &[]);
        }
        t.tick(SEC, 0, LIMIT, None, &[]);
        assert_eq!(t.committed_ms, 120 * SEC);
        let top = t.top(5);
        assert_eq!(top[0], AppTime { name: "Visual Studio Code".into(), ms: 90 * SEC });
        assert_eq!(top[1], AppTime { name: "Firefox".into(), ms: 30 * SEC });
        assert_eq!(t.top(1).len(), 1);
    }

    #[test]
    fn idle_wait_is_dropped_per_app_too() {
        let mut t = Tracker::default();
        t.tick(SEC, 0, LIMIT, FX, &[]);
        // Reading in Firefox, then walking away: nothing pending survives.
        for i in 1..=300 {
            t.tick(SEC, i * SEC, LIMIT, FX, &[]);
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
            fullscreen: false,
            monitor: 0,
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
            assert_eq!(t.tick(SEC, 200, LIMIT, FX, &[]), State::Active);
        }
        assert_eq!(t.committed_ms, 90 * SEC);
    }

    #[test]
    fn reading_without_input_commits_when_input_returns() {
        let mut t = Tracker::default();
        // Four minutes of reading, no input: held as pending, not shown yet.
        for i in 1..=240 {
            t.tick(SEC, i * SEC, LIMIT, FX, &[]);
        }
        assert_eq!(t.committed_ms, 0);
        // One scroll proves it was not idle: all four minutes appear at once.
        t.tick(SEC, 300, LIMIT, FX, &[]);
        assert_eq!(t.committed_ms, 241 * SEC);
    }

    #[test]
    fn idle_wait_never_leaks_and_display_never_drops() {
        let mut t = Tracker::default();
        t.tick(SEC, 0, LIMIT, FX, &[]);
        let before = t.committed_ms;
        let mut shown = before;
        // Walk away for ten minutes with a browser open.
        for i in 1..=600 {
            t.tick(SEC, i * SEC, LIMIT, FX, &[]);
            assert!(t.committed_ms >= shown, "display dropped");
            shown = t.committed_ms;
        }
        assert_eq!(t.committed_ms, before);
        // Coming back counts from the first input only.
        assert_eq!(t.tick(SEC, 0, LIMIT, FX, &[]), State::Active);
        assert_eq!(t.committed_ms, before + SEC);
    }

    #[test]
    fn desktop_and_lock_screen_do_not_count() {
        let mut t = Tracker::default();
        for _ in 0..30 {
            assert_eq!(t.tick(SEC, 0, LIMIT, None, &[]), State::Hold);
        }
        assert_eq!(t.committed_ms, 0);
    }

    #[test]
    fn sleep_gap_is_ignored() {
        let mut t = Tracker::default();
        t.tick(SEC, 30 * SEC, LIMIT, FX, &[]); // pending before sleep
        assert_eq!(t.tick(8 * 60 * MIN, 0, LIMIT, FX, &[]), State::Hold);
        assert_eq!(t.committed_ms, 0);
        t.tick(SEC, 0, LIMIT, FX, &[]);
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
