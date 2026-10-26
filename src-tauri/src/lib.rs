mod battery;
mod breaks;
mod history;
mod names;
mod tracker;

use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::{Mutex, MutexGuard};
use std::thread;
use std::time::{Duration, Instant, SystemTime};

use history::{Day, Settings, Store, RETENTION_CHOICES};
use serde::Serialize;
use tauri::{
    AppHandle, Emitter, Manager, PhysicalPosition, State as TauriState, WebviewUrl, WebviewWindowBuilder,
};
use tracker::{format_duration, is_real_app, State, Tracker, Window};

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
    /// The running break's full length, for the countdown ring.
    break_total_ms: Option<u64>,
    /// False for an eye reminder that does not pause screen time.
    break_pauses: Option<bool>,
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
}

struct AppState {
    core: Mutex<Core>,
    store: Store,
}

impl AppState {
    fn lock(&self) -> MutexGuard<'_, Core> {
        // A panic while holding the lock leaves the data usable; keep going.
        self.core.lock().unwrap_or_else(|e| e.into_inner())
    }

    fn save_today(&self, core: &mut Core) {
        self.store.save_day(&Day {
            day: core.day.clone(),
            total_ms: core.tracker.committed_ms,
            apps: core.tracker.apps.clone(),
        });
        core.dirty = false;
    }
}

fn today() -> String {
    chrono::Local::now().format("%Y-%m-%d").to_string()
}

#[cfg(windows)]
fn is_minimized(window_id: &str) -> bool {
    use windows_sys::Win32::UI::WindowsAndMessaging::IsIconic;
    // active-win-pos-rs formats the handle as "HWND(328646)".
    let digits = window_id.trim_start_matches("HWND(").trim_end_matches(')');
    match digits.parse::<isize>() {
        Ok(hwnd) => unsafe { IsIconic(hwnd as _) != 0 },
        Err(_) => false,
    }
}

#[cfg(not(windows))]
fn is_minimized(_window_id: &str) -> bool {
    // shortcut: macOS and Linux never report a minimized window as foreground
    // in our tests so far, revisit if probe output there shows otherwise.
    false
}

/// `names` caches display names by exe path: resolving reads files and asks
/// Windows, which is too slow to repeat every second.
fn foreground(names: &mut HashMap<PathBuf, String>) -> Option<Window> {
    let w = active_win_pos_rs::get_active_window().ok()?;
    let mut exe = w
        .process_path
        .file_name()
        .map(|n| n.to_string_lossy().to_lowercase())
        .unwrap_or_default();
    // Built-in apps (Settings, Calculator, Photos) draw their windows through
    // this shared host, so the exe says nothing; the window title is the app.
    if exe == "applicationframehost.exe" && !w.title.trim().is_empty() {
        let title = w.title.trim().to_string();
        exe = format!("uwp:{}", title.to_lowercase());
        return Some(Window {
            exe,
            name: title,
            is_self: false,
            minimized: is_minimized(&w.window_id),
            title: w.title,
            width: w.position.width,
            height: w.position.height,
        });
    }
    let name = names
        .entry(w.process_path.clone())
        .or_insert_with(|| {
            names::resolve(&w.process_path, w.process_id as u32)
                .or_else(|| Some(w.app_name.trim().to_string()).filter(|n| !n.is_empty()))
                .unwrap_or_else(|| exe.clone())
        })
        .clone();
    Some(Window {
        exe,
        name,
        is_self: w.process_id == u64::from(std::process::id()),
        minimized: is_minimized(&w.window_id),
        title: w.title,
        width: w.position.width,
        height: w.position.height,
    })
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
        break_pauses: core.breaks.active.map(|a| a.pauses),
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
    let mut last_tick = SystemTime::now();
    let mut last_save = Instant::now();
    let mut names = HashMap::new();
    let mut ticks: u64 = 0;

    loop {
        thread::sleep(Duration::from_secs(1));
        let check_battery = ticks % BATTERY_EVERY == 0;
        ticks += 1;
        let battery = if check_battery { battery::read() } else { None };
        let mut quit = false;

        // Wall clock, so time spent asleep shows up as one long gap.
        // A clock that jumped backwards counts as a gap too.
        let now = SystemTime::now();
        let elapsed_ms = now
            .duration_since(last_tick)
            .map(|d| d.as_millis() as u64)
            .unwrap_or(u64::MAX);
        last_tick = now;

        // If idle time cannot be read, treat it as idle: showing too little
        // is better than silently counting time nobody was there for.
        let idle_ms = user_idle::UserIdle::get_time()
            .map(|t| t.as_milliseconds() as u64)
            .unwrap_or(u64::MAX);
        let window = foreground(&mut names);
        let app_in_front = window
            .as_ref()
            .filter(|w| is_real_app(Some(w)))
            .map(|w| (w.exe.as_str(), w.name.as_str()));

        let mut alerts = Vec::new();
        let tick = {
            let mut core = state.lock();

            let day = today();
            if day != core.day {
                state.save_today(&mut core);
                core.day = day;
                core.tracker = Tracker::default();
                core.limit_alerted = false;
                state.store.prune(&core.day, core.settings.retention_days);
            }

            // Nothing counts during a pausing break (an eye reminder does not pause).
            let pausing = core.breaks.pausing();
            let before = core.tracker.committed_ms;
            let tick_state = core.tracker.tick(elapsed_ms, idle_ms, if pausing { None } else { app_in_front });
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

/// End the running break early: Done.
#[tauri::command]
fn finish_break(state: TauriState<AppState>) {
    state.lock().breaks.finish();
}

/// End the running break and bring it back after 5 more minutes of screen time.
#[tauri::command]
fn snooze_break(state: TauriState<AppState>) {
    let mut core = state.lock();
    let c = &mut *core;
    c.breaks.snooze(&c.settings.breaks);
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
            snooze_break,
            start_countdown,
            cancel_countdown,
            clear_history,
            open_dashboard
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

            let store = Store::new(app.path().app_data_dir()?);
            let settings = store.load_settings();
            let day = today();
            store.prune(&day, settings.retention_days);
            store.migrate_today_json(&day);
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
                }),
                store,
            });

            let handle = app.handle().clone();
            thread::spawn(move || run_tracker(handle));
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
