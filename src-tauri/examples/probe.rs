//! Probe: prints what the OS reports as the foreground window, plus idle time.
//!
//! Run from `src-tauri`:  cargo run --example probe
//! Then click the bare desktop, the taskbar, a File Explorer window, a browser,
//! and lock the screen (Win+L), so we can see what each one looks like.
//! Stop with Ctrl+C.
//!
//! A line is printed whenever the foreground window changes, and a heartbeat
//! line every 5 seconds so idle time can be watched climbing.

use std::thread::sleep;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

use active_win_pos_rs::get_active_window;
use user_idle::UserIdle;

fn clock() -> String {
    // UTC time of day; enough to line events up with what you did.
    let secs = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    format!(
        "{:02}:{:02}:{:02}Z",
        (secs / 3600) % 24,
        (secs / 60) % 60,
        secs % 60
    )
}

fn main() {
    println!("serion probe: Ctrl+C to stop");
    let mut last_key = String::new();
    let mut last_heartbeat = Instant::now();

    loop {
        let idle = match UserIdle::get_time() {
            Ok(t) => format!("{}s", t.as_seconds()),
            Err(e) => format!("error({e:?})"),
        };

        let (key, line) = match get_active_window() {
            Ok(w) => {
                let key = format!("{}|{}|{}", w.process_id, w.window_id, w.title);
                let line = format!(
                    "app={:?} title={:?} pid={} hwnd={} path={:?} pos=({},{} {}x{})",
                    w.app_name,
                    w.title,
                    w.process_id,
                    w.window_id,
                    w.process_path,
                    w.position.x,
                    w.position.y,
                    w.position.width,
                    w.position.height
                );
                (key, line)
            }
            // No foreground window: seen on the lock screen and during UAC prompts.
            Err(()) => ("none".to_string(), "no foreground window (Err)".to_string()),
        };

        if key != last_key {
            println!("{} CHANGE idle={idle} {line}", clock());
            last_key = key;
            last_heartbeat = Instant::now();
        } else if last_heartbeat.elapsed() >= Duration::from_secs(5) {
            println!("{} beat   idle={idle}", clock());
            last_heartbeat = Instant::now();
        }

        sleep(Duration::from_secs(1));
    }
}
