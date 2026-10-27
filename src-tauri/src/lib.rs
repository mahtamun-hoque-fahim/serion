mod battery;
mod breaks;
mod crypto;
mod history;
mod names;
mod screen;
mod tracker;

use std::path::PathBuf;
use std::sync::{Mutex, MutexGuard};
use std::thread;
use std::time::{Duration, Instant, SystemTime};

use history::{Day, ImportMode, Settings, Store, RETENTION_CHOICES};
use serde::Serialize;
use tauri::{
    AppHandle, Emitter, Manager, PhysicalPosition, RunEvent, State as TauriState, WebviewUrl, WebviewWindowBuilder,
};
use tracker::{classify, credit, format_duration, open_apps, other_screens, Front, State, Tracker, IDLE_LIMIT_MS, MAX_TICK_MS};

/// How often today's file is written to disk while it changes.
const SAVE_EVERY: Duration = Duration::from_secs(10);

/// Gap between the pill and the top edge of the screen, in physical pixels.
/// The magnetic dock in src/drag.ts uses the same value.
const TOP_MARGIN: i32 = 8;

/// Apps listed under the pill.
const TOP_APPS: usize = 5;

/// Longest a limit or countdown may be: one day.
const MAX_TIMER_MINUTES: u32 = 24 * 60;

/// Battery is read on the first tick, then every this many ticks (seconds).
const BATTERY_EVERY: u64 = 30;

/// Reading mode: idle only after this long without input...
const READING_IDLE_MS: u64 = 20 * 60_000;
/// ...and it switches itself off after this long, so it cannot inflate the day.
const READING_MAX: Duration = Duration::from_secs(60 * 60);

/// Sent to every window once a second.
#[derive(Serialize, Clone)]
struct Tick {
    text: String,
    state: State,
    total_ms: u64,
    top: Vec<TopApp>,
    /// Time left on the countdown, when one runs.
    countdown_ms: Option<u64>,
    limit_ms: Option<u64>,
    /// The running break, if any, and its time left.
    break_kind: Option<breaks::Kind>,
    break_ms: Option<u64>,
    /// The running break's full length, for the progress ring.
    break_total_ms: Option<u64>,
    /// Due breaks waiting on the pill for you to start or skip.
    break_offers: Vec<BreakOffer>,
    /// Today's date: a change means midnight passed (the pill flips a calendar).
    day: String,
    reading: bool,
    /// A fullscreen app is in front and the pill should stay out of its way.
    hide_for_fullscreen: bool,
    /// The data folder could not be written last time (a removed drive?).
    storage_problem: bool,
}

#[derive(Serialize, Clone)]
struct BreakOffer {
    kind: breaks::Kind,
    /// How long it will last once started.
    seconds: u64,
}

#[derive(Serialize, Clone)]
struct TopApp {
    name: String,
    ms: u64,
    text: String,
}

/// Everything the loop and the commands share.
struct Core {
    day: String,
    tracker: Tracker,
    settings: Settings,
    countdown_end: Option<SystemTime>,
    /// The daily limit already fired today (or was already passed when set).
    limit_alerted: bool,
    /// Today's numbers changed since the last save.
    dirty: bool,
    /// Low on battery at the last check; None before the first check.
    was_low: Option<bool>,
    breaks: breaks::Breaks,
    /// The app that got the last second, for reading mode.
    last_app: Option<String>,
    reading: Option<Reading>,
    /// A fullscreen app is in front right now.
    fullscreen: bool,
    /// The last save failed; counting carries on in memory.
    storage_problem: bool,
}

/// Reading mode, tied to the app it was switched on in.
struct Reading {
    exe: String,
    until: Instant,
}

struct AppState {
    core: Mutex<Core>,
    store: Store,
    /// The default app data folder, where a chosen data folder is remembered.
    default_dir: PathBuf,
}

impl AppState {
    fn lock(&self) -> MutexGuard<'_, Core> {
        // A panic while holding the lock leaves the data usable; keep going.
        self.core.lock().unwrap_or_else(|e| e.into_inner())
    }

    fn save_today(&self, core: &mut Core) {
        let saved = self.store.save_day(&today_record(core));
        core.storage_problem = !saved;
        core.dirty = !saved;
    }
}

/// Today's numbers as a Day, from memory.
fn today_record(core: &Core) -> Day {
    Day { day: core.day.clone(), total_ms: core.tracker.committed_ms, apps: core.tracker.apps.clone() }
}

fn today() -> String {
    chrono::Local::now().format("%Y-%m-%d").to_string()
}

fn tick_payload(core: &Core, state: State, now: SystemTime) -> Tick {
    Tick {
        text: format_duration(core.tracker.committed_ms),
        state,
        total_ms: core.tracker.committed_ms,
        top: core
            .tracker
            .top(TOP_APPS)
            .into_iter()
            .map(|a| TopApp { text: format_duration(a.ms), name: a.name, ms: a.ms })
            .collect(),
        countdown_ms: core
            .countdown_end
            .map(|end| end.duration_since(now).map(|d| d.as_millis() as u64).unwrap_or(0)),
        limit_ms: core.settings.limit_ms,
        break_kind: core.breaks.active.map(|a| a.kind),
        break_ms: core.breaks.active.map(|a| a.left_ms),
        break_total_ms: core.breaks.active.map(|a| a.length_ms),
        break_offers: core
            .breaks
            .offered
            .iter()
            .map(|&kind| BreakOffer { kind, seconds: core.settings.breaks.length_ms(kind) / 1000 })
            .collect(),
        day: core.day.clone(),
        reading: core.reading.is_some(),
        hide_for_fullscreen: core.fullscreen && !core.settings.show_over_fullscreen,
        storage_problem: core.storage_problem,
    }
}

/// Whole-screen flash: a transparent, click-through window over the primary
/// screen. The page inside plays the flash and closes the window itself.
fn show_flash(app: &AppHandle) {
    if app.get_webview_window("flash").is_some() {
        return;
    }
    let Some(main) = app.get_webview_window("main") else { return };
    let Ok(Some(monitor)) = main.primary_monitor() else { return };
    let hide_from_capture = app.state::<AppState>().lock().settings.hide_from_capture;
    let scale = monitor.scale_factor();
    let size = monitor.size().to_logical::<f64>(scale);
    let origin = monitor.position().to_logical::<f64>(scale);
    let built = WebviewWindowBuilder::new(app, "flash", WebviewUrl::App("index.html?view=flash".into()))
        .title("serion flash")
        .decorations(false)
        .transparent(true)
        .shadow(false)
        .always_on_top(true)
        .skip_taskbar(true)
        .focused(false)
        .content_protected(hide_from_capture)
        .resizable(false)
        .position(origin.x, origin.y)
        .inner_size(size.width, size.height)
        .build();
    if let Ok(window) = built {
        let _ = window.set_ignore_cursor_events(true);
    }
}

fn alert(app: &AppHandle, kind: &str) {
    let _ = app.emit("alert", kind);
    show_flash(app);
}

fn run_tracker(app: AppHandle) {
    let state = app.state::<AppState>();
    // Steady clock for durations: changing the clock or the timezone never
    // adds or removes counted time. The wall clock only decides the date.
    let mut last_tick = Instant::now();
    let mut last_save = Instant::now();
    let mut names = screen::NameCache::new();
    let mut ticks: u64 = 0;
    let mut previous_idle_ms: u64 = 0;

    loop {
        thread::sleep(Duration::from_secs(1));
        let check_battery = ticks % BATTERY_EVERY == 0;
        ticks += 1;
        let battery = if check_battery { battery::read() } else { None };
        let mut quit = false;

        let elapsed_ms = last_tick.elapsed().as_millis() as u64;
        last_tick = Instant::now();
        let now = SystemTime::now();

        let snap = screen::snapshot(&mut names);
        // A video, call or game keeping the display on means you are there,
        // even without touching the mouse or keyboard. Otherwise, if idle
        // time cannot be read, treat it as idle: too little beats too much.
        let idle_ms = if snap.awake {
            0
        } else {
            user_idle::UserIdle::get_time().map(|t| t.as_milliseconds() as u64).unwrap_or(u64::MAX)
        };
        let open = open_apps(&snap.windows);
        let main = credit(snap.foreground.as_ref(), &open);

        let mut alerts = Vec::new();
        let tick = {
            let mut core = state.lock();

            // Reading mode ends when you move to another app, or after an hour.
            if let Some(reading) = &core.reading {
                if Instant::now() >= reading.until || main.is_some_and(|m| m.exe != reading.exe) {
                    core.reading = None;
                }
            }
            let idle_limit = if core.reading.is_some() { READING_IDLE_MS } else { IDLE_LIMIT_MS };

            // Back after being away (idle, locked, asleep): breaks that short count as taken.
            let away_ms = if elapsed_ms > MAX_TICK_MS {
                elapsed_ms
            } else if previous_idle_ms >= idle_limit && idle_ms < previous_idle_ms {
                previous_idle_ms
            } else {
                0
            };
            previous_idle_ms = idle_ms;
            if away_ms > 0 {
                let c = &mut *core;
                c.breaks.away(away_ms, &c.settings.breaks);
            }

            let day = today();
            if day != core.day {
                // Active time before 00:00 stays on the day it happened.
                if idle_ms < idle_limit {
                    core.tracker.commit();
                }
                state.save_today(&mut core);
                core.day = day;
                core.tracker = Tracker::default();
                core.limit_alerted = false;
                state.store.prune(&core.day, core.settings.retention_days);
            }

            let use_other_screens = core.settings.other_screens.unwrap_or(snap.monitors > 1);
            let extras: Vec<(&str, &str)> = match main {
                Some(m) if use_other_screens => {
                    other_screens(m, &open).into_iter().map(|w| (w.exe.as_str(), w.name.as_str())).collect()
                }
                _ => Vec::new(),
            };
            core.last_app = main.map(|m| m.exe.clone());
            core.fullscreen =
                snap.foreground.as_ref().is_some_and(|w| w.fullscreen && classify(Some(w)) == Front::App);

            // Nothing counts while a started break runs.
            let app_now = if core.breaks.pausing() { None } else { main.map(|w| (w.exe.as_str(), w.name.as_str())) };
            let before = core.tracker.committed_ms;
            let tick_state = core.tracker.tick(elapsed_ms, idle_ms, idle_limit, app_now, &extras);
            let counted = core.tracker.committed_ms - before;
            if counted > 0 {
                core.dirty = true;
            }
            // Reborrow once so the breaks and the settings can be used together.
            let c = &mut *core;
            c.breaks.tick(counted, elapsed_ms, &c.settings.breaks);

            if let Some(limit) = core.settings.limit_ms {
                if !core.limit_alerted && core.tracker.committed_ms >= limit {
                    core.limit_alerted = true;
                    alerts.push("limit");
                }
            }
            if core.countdown_end.is_some_and(|end| now >= end) {
                core.countdown_end = None;
                alerts.push("countdown");
            }

            if check_battery {
                let low = battery.is_some_and(|b| b.is_low(core.settings.battery_threshold));
                quit = core.settings.battery_quit && battery::entered_low(core.was_low, low);
                core.was_low = Some(low);
            }

            if quit || (core.dirty && last_save.elapsed() >= SAVE_EVERY) {
                state.save_today(&mut core);
                last_save = Instant::now();
            }
            tick_payload(&core, tick_state, now)
        };

        if quit {
            // Low battery and the user asked Serion to step aside: today is saved.
            app.exit(0);
            return;
        }

        let _ = app.emit("tick", tick);
        for kind in alerts {
            alert(&app, kind);
        }
    }
}

/// Reading mode on or off. It needs an app in front to attach to; returns
/// whether it is on now.
#[tauri::command]
fn set_reading(on: bool, state: TauriState<AppState>) -> bool {
    let mut core = state.lock();
    core.reading = match (on, core.last_app.clone()) {
        (true, Some(exe)) => Some(Reading { exe, until: Instant::now() + READING_MAX }),
        _ => None,
    };
    core.reading.is_some()
}

/// Fullscreen, multi-screen and screen-recording preferences.
#[tauri::command]
fn set_display(
    show_over_fullscreen: bool,
    other_screens: Option<bool>,
    hide_from_capture: bool,
    app: AppHandle,
    state: TauriState<AppState>,
) -> Settings {
    let mut core = state.lock();
    core.settings.show_over_fullscreen = show_over_fullscreen;
    core.settings.other_screens = other_screens;
    core.settings.hide_from_capture = hide_from_capture;
    state.store.save_settings(&core.settings);
    for label in ["main", "flash"] {
        if let Some(window) = app.get_webview_window(label) {
            let _ = window.set_content_protected(hide_from_capture);
        }
    }
    core.settings.clone()
}

/// How many screens are connected (for the "other screens" setting).
#[tauri::command]
fn monitor_count() -> usize {
    screen::snapshot(&mut screen::NameCache::new()).monitors
}

#[tauri::command]
fn quit(app: AppHandle, state: TauriState<AppState>) {
    let mut core = state.lock();
    state.save_today(&mut core);
    app.exit(0);
}

/// The last `days` days, oldest first; today comes from memory, so it is live.
#[tauri::command]
fn get_history(days: u32, state: TauriState<AppState>) -> Vec<Day> {
    let core = state.lock();
    let mut history = state.store.last_days(&core.day, days.clamp(1, 1825));
    if let Some(last) = history.last_mut() {
        *last = Day { day: core.day.clone(), total_ms: core.tracker.committed_ms, apps: core.tracker.apps.clone() };
    }
    history
}

#[tauri::command]
fn get_settings(state: TauriState<AppState>) -> Settings {
    state.lock().settings.clone()
}

#[tauri::command]
fn set_retention(days: u32, state: TauriState<AppState>) -> Result<Settings, String> {
    if !RETENTION_CHOICES.contains(&days) {
        return Err(format!("retention must be one of {RETENTION_CHOICES:?} days"));
    }
    let mut core = state.lock();
    core.settings.retention_days = days;
    state.store.save_settings(&core.settings);
    state.store.prune(&core.day, days);
    Ok(core.settings.clone())
}

/// `minutes`: the daily limit, or None to turn it off.
#[tauri::command]
fn set_limit(minutes: Option<u32>, state: TauriState<AppState>) -> Result<Settings, String> {
    if minutes.is_some_and(|m| m == 0 || m > MAX_TIMER_MINUTES) {
        return Err(format!("limit must be 1 to {MAX_TIMER_MINUTES} minutes"));
    }
    let mut core = state.lock();
    core.settings.limit_ms = minutes.map(|m| u64::from(m) * 60_000);
    // A limit already passed today does not fire the moment you set it.
    core.limit_alerted = core.settings.limit_ms.is_some_and(|l| core.tracker.committed_ms >= l);
    state.store.save_settings(&core.settings);
    Ok(core.settings.clone())
}

#[tauri::command]
fn set_battery_quit(enabled: bool, threshold: u8, state: TauriState<AppState>) -> Result<Settings, String> {
    if !battery::THRESHOLD_CHOICES.contains(&threshold) {
        return Err(format!("threshold must be one of {:?} percent", battery::THRESHOLD_CHOICES));
    }
    let mut core = state.lock();
    core.settings.battery_quit = enabled;
    core.settings.battery_threshold = threshold;
    // Already low when you turn it on (or raise the level): not an entry, so
    // Serion keeps running until the next time the battery runs low.
    core.was_low = Some(battery::read().is_some_and(|b| b.is_low(threshold)));
    state.store.save_settings(&core.settings);
    Ok(core.settings.clone())
}

/// Current battery, or None on machines without one.
#[tauri::command]
fn get_battery() -> Option<battery::Battery> {
    battery::read()
}

#[tauri::command]
fn start_countdown(minutes: u32, state: TauriState<AppState>) -> Result<(), String> {
    if minutes == 0 || minutes > MAX_TIMER_MINUTES {
        return Err(format!("countdown must be 1 to {MAX_TIMER_MINUTES} minutes"));
    }
    state.lock().countdown_end = Some(SystemTime::now() + Duration::from_secs(u64::from(minutes) * 60));
    Ok(())
}

#[tauri::command]
fn cancel_countdown(state: TauriState<AppState>) {
    state.lock().countdown_end = None;
}

/// Water, stretch and eye break settings, all at once.
#[tauri::command]
fn set_breaks(config: breaks::Config, state: TauriState<AppState>) -> Result<Settings, String> {
    config.validate()?;
    let mut core = state.lock();
    core.settings.breaks = config;
    state.store.save_settings(&core.settings);
    Ok(core.settings.clone())
}

/// Start an offered break: screen time pauses for its length.
#[tauri::command]
fn start_break(kind: breaks::Kind, state: TauriState<AppState>) -> bool {
    let mut core = state.lock();
    let c = &mut *core;
    c.breaks.start(kind, &c.settings.breaks)
}

/// Not now: drop an offered break until its next interval.
#[tauri::command]
fn skip_break(kind: breaks::Kind, state: TauriState<AppState>) {
    state.lock().breaks.skip(kind);
}

/// End the running break early: Done.
#[tauri::command]
fn finish_break(state: TauriState<AppState>) {
    state.lock().breaks.finish();
}

/// Delete all saved days and reset today to zero. Settings stay.
#[tauri::command]
fn clear_history(state: TauriState<AppState>) {
    let mut core = state.lock();
    state.store.clear();
    core.tracker = Tracker::default();
    core.limit_alerted = false;
    core.dirty = false;
}

/// Move and resize the pill window in one step (physical px), so the pill
/// does not jump when the window grows to the left for a centered panel.
#[tauri::command]
fn set_bounds(x: i32, y: i32, width: u32, height: u32, window: tauri::WebviewWindow) -> Result<(), String> {
    #[cfg(windows)]
    {
        use windows_sys::Win32::UI::WindowsAndMessaging::{SetWindowPos, SWP_NOACTIVATE, SWP_NOZORDER};
        let hwnd = window.hwnd().map_err(|e| e.to_string())?;
        let flags = SWP_NOACTIVATE | SWP_NOZORDER;
        // SAFETY: a valid handle for this window; SetWindowPos only reads its arguments.
        let ok = unsafe { SetWindowPos(hwnd.0 as _, std::ptr::null_mut(), x, y, width as i32, height as i32, flags) };
        if ok == 0 { Err("could not move the window".into()) } else { Ok(()) }
    }
    #[cfg(not(windows))]
    {
        window.set_position(PhysicalPosition::new(x, y)).map_err(|e| e.to_string())?;
        window.set_size(tauri::PhysicalSize::new(width, height)).map_err(|e| e.to_string())
    }
}

/// The data folder in use, and whether it is the default one.
#[tauri::command]
fn get_data_folder(state: TauriState<AppState>) -> (String, bool) {
    let root = state.store.root();
    (root.to_string_lossy().into_owned(), root == state.default_dir)
}

/// Use another data folder: move everything there, or start fresh there
/// (history empty, settings kept). None goes back to the default folder.
#[tauri::command]
fn set_data_folder(path: Option<String>, move_data: bool, state: TauriState<AppState>) -> Result<String, String> {
    let target = path.map(PathBuf::from).unwrap_or_else(|| state.default_dir.clone());
    if !target.is_absolute() {
        return Err("Pick a full folder path.".into());
    }
    let mut core = state.lock();
    state.save_today(&mut core);
    state.store.move_to(&target, &state.default_dir, move_data, &core.settings)?;
    if !move_data {
        core.tracker = Tracker::default();
        core.limit_alerted = false;
    }
    state.save_today(&mut core);
    Ok(target.to_string_lossy().into_owned())
}

/// Write everything (history and settings) to one sealed export file.
/// Returns how many days it holds.
#[tauri::command]
fn export_data(path: String, state: TauriState<AppState>) -> Result<usize, String> {
    let core = state.lock();
    let (bytes, days) = state.store.export(&core.settings, &today_record(&core));
    std::fs::write(&path, bytes).map_err(|e| format!("Could not write the export: {e}"))?;
    Ok(days)
}

#[derive(Serialize)]
struct ImportReport {
    written: usize,
    /// Older than the history limit, so left out.
    skipped: usize,
}

/// Bring in an export file. Refused if it is not a Serion export, was
/// changed, or holds impossible values. Replace also takes its settings.
#[tauri::command]
fn import_data(path: String, mode: ImportMode, state: TauriState<AppState>) -> Result<ImportReport, String> {
    let bytes = std::fs::read(&path).map_err(|e| format!("Could not read that file: {e}"))?;
    let mut core = state.lock();
    let bundle = history::open_bundle(&bytes, &core.day)?;
    state.save_today(&mut core);
    if mode == ImportMode::Replace {
        core.settings = bundle.settings.clone();
        state.store.save_settings(&core.settings);
    }
    let (written, skipped) = state.store.import(&bundle, mode, &core.day, core.settings.retention_days);
    // Today may have changed: carry on from the merged numbers.
    let merged = state.store.load_day(&core.day);
    core.tracker = Tracker::new(merged.total_ms, merged.apps);
    core.limit_alerted = core.settings.limit_ms.is_some_and(|l| core.tracker.committed_ms >= l);
    Ok(ImportReport { written, skipped })
}

/// Show the dashboard, creating it the first time. Async: building a window
/// inside a synchronous command can deadlock on Windows.
#[tauri::command]
async fn open_dashboard(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("dashboard") {
        let _ = window.unminimize();
        let _ = window.show();
        return window.set_focus().map_err(|e| e.to_string());
    }
    WebviewWindowBuilder::new(&app, "dashboard", WebviewUrl::App("index.html?view=dashboard".into()))
        .title("Serion")
        .inner_size(920.0, 640.0)
        .min_inner_size(760.0, 540.0)
        .center()
        .decorations(false)
        .transparent(true)
        .shadow(false)
        .build()
        .map(|_| ())
        .map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // Start at login; the UI turns it on for installed builds (Settings.tsx).
        // File pickers for the data folder, export and import.
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .invoke_handler(tauri::generate_handler![
            quit,
            get_history,
            get_settings,
            set_retention,
            set_limit,
            set_battery_quit,
            get_battery,
            set_breaks,
            finish_break,
            start_break,
            skip_break,
            start_countdown,
            cancel_countdown,
            clear_history,
            open_dashboard,
            set_reading,
            set_display,
            monitor_count,
            set_bounds,
            get_data_folder,
            set_data_folder,
            export_data,
            import_data
        ])
        .setup(|app| {
            let window = app
                .get_webview_window("main")
                .expect("main window is declared in tauri.conf.json");

            // Top center of the primary screen, where a notch would be.
            if let Some(monitor) = window.primary_monitor()? {
                let screen = monitor.size();
                let origin = monitor.position();
                let pill = window.outer_size()?;
                let x = origin.x + (screen.width as i32 - pill.width as i32) / 2;
                window.set_position(PhysicalPosition::new(x, origin.y + TOP_MARGIN))?;
            }
            window.show()?;

            let default_dir = app.path().app_data_dir()?;
            let store = Store::new(Store::locate(&default_dir));
            let settings = store.load_settings();
            // Hidden from recordings and screenshots, if you asked for it.
            window.set_content_protected(settings.hide_from_capture)?;
            let day = today();
            store.prune(&day, settings.retention_days);
            store.migrate_today_json(&day);
            store.seal_legacy();
            let saved = store.load_day(&day);
            let tracker = Tracker::new(saved.total_ms, saved.apps);
            let limit_alerted = settings.limit_ms.is_some_and(|l| tracker.committed_ms >= l);
            app.manage(AppState {
                core: Mutex::new(Core {
                    day,
                    tracker,
                    settings,
                    countdown_end: None,
                    limit_alerted,
                    dirty: false,
                    was_low: None,
                    breaks: breaks::Breaks::default(),
                    last_app: None,
                    reading: None,
                    fullscreen: false,
                    storage_problem: false,
                }),
                store,
                default_dir,
            });

            let handle = app.handle().clone();
            thread::spawn(move || run_tracker(handle));
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app, event| {
            // However Serion closes, today's numbers are saved first.
            if let RunEvent::ExitRequested { .. } | RunEvent::Exit = event {
                if let Some(state) = app.try_state::<AppState>() {
                    let mut core = state.lock();
                    state.save_today(&mut core);
                }
            }
        });
}
