mod tracker;

use std::fs;
use std::path::{Path, PathBuf};
use std::thread;
use std::time::{Duration, Instant, SystemTime};

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager, PhysicalPosition};
use tracker::{format_duration, is_real_app, State, Tracker, Window};

/// How often today's total is written to disk while it changes.
const SAVE_EVERY: Duration = Duration::from_secs(10);

/// Gap between the pill and the top edge of the screen, in physical pixels.
const TOP_MARGIN: i32 = 8;

/// What survives a restart: the day and that day's committed total.
#[derive(Serialize, Deserialize, Default)]
struct Saved {
    day: String,
    ms: u64,
}

/// Sent to the UI every second.
#[derive(Serialize, Clone)]
struct Tick {
    text: String,
    state: State,
}

fn today() -> String {
    chrono::Local::now().format("%Y-%m-%d").to_string()
}

fn load(file: &Path) -> Saved {
    fs::read_to_string(file)
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

/// Write to a temp file, then rename: a crash mid-write cannot corrupt the old file.
fn save(file: &Path, saved: &Saved) {
    let Ok(json) = serde_json::to_string(saved) else { return };
    let tmp = file.with_extension("json.tmp");
    if let Some(dir) = file.parent() {
        let _ = fs::create_dir_all(dir);
    }
    if fs::write(&tmp, json).is_ok() {
        let _ = fs::rename(&tmp, file);
    }
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

fn foreground() -> Option<Window> {
    let w = active_win_pos_rs::get_active_window().ok()?;
    let exe = w
        .process_path
        .file_name()
        .map(|n| n.to_string_lossy().to_lowercase())
        .unwrap_or_default();
    Some(Window {
        exe,
        minimized: is_minimized(&w.window_id),
        title: w.title,
        width: w.position.width,
        height: w.position.height,
    })
}

fn run_tracker(app: AppHandle, file: Option<PathBuf>) {
    let mut saved = file.as_deref().map(load).unwrap_or_default();
    if saved.day != today() {
        saved = Saved { day: today(), ms: 0 };
    }
    let mut tracker = Tracker::new(saved.ms);
    let mut last_tick = SystemTime::now();
    let mut last_save = Instant::now();

    loop {
        thread::sleep(Duration::from_secs(1));

        // Wall clock, so time spent asleep shows up as one long gap.
        // A clock that jumped backwards counts as a gap too.
        let now = SystemTime::now();
        let elapsed_ms = now
            .duration_since(last_tick)
            .map(|d| d.as_millis() as u64)
            .unwrap_or(u64::MAX);
        last_tick = now;

        let day = today();
        if day != saved.day {
            tracker = Tracker::default();
            saved = Saved { day, ms: 0 };
        }

        // If idle time cannot be read, treat it as idle: showing too little
        // is better than silently counting time nobody was there for.
        let idle_ms = user_idle::UserIdle::get_time()
            .map(|t| t.as_milliseconds() as u64)
            .unwrap_or(u64::MAX);

        let state = tracker.tick(elapsed_ms, idle_ms, is_real_app(foreground().as_ref()));
        let _ = app.emit(
            "tick",
            Tick { text: format_duration(tracker.committed_ms), state },
        );

        if tracker.committed_ms != saved.ms && last_save.elapsed() >= SAVE_EVERY {
            saved.ms = tracker.committed_ms;
            if let Some(f) = &file {
                save(f, &saved);
            }
            last_save = Instant::now();
        }
    }
}

#[tauri::command]
fn quit(app: AppHandle) {
    app.exit(0);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![quit])
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

            let file = app.path().app_data_dir().ok().map(|d| d.join("today.json"));
            let handle = app.handle().clone();
            thread::spawn(move || run_tracker(handle, file));
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
