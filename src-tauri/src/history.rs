//! Day history on disk: one JSON file per day, plus a small settings file.
//!
//! Layout inside the app data folder:
//!   history/2026-10-26.json   {"day","total_ms","apps":{exe:{name,ms}}}
//!   settings.json             {"retention_days","limit_ms"}
//! Plain JSON so you can read, back up or delete it by hand.

use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};

use chrono::{Days, NaiveDate};
use serde::{Deserialize, Serialize};

use crate::tracker::AppTime;

/// How long history may be kept, in days: 7 days up to 5 years.
pub const RETENTION_CHOICES: [u32; 7] = [7, 30, 90, 180, 365, 730, 1825];
const DEFAULT_RETENTION: u32 = 30;

#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
pub struct Day {
    pub day: String,
    pub total_ms: u64,
    pub apps: HashMap<String, AppTime>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(default)]
pub struct Settings {
    pub retention_days: u32,
    /// Daily screen-time limit; None means no limit.
    pub limit_ms: Option<u64>,
    /// Quit Serion when the battery runs low. Off by default.
    pub battery_quit: bool,
    /// "Low" for battery_quit, in percent.
    pub battery_threshold: u8,
    /// Water, stretch and eye breaks.
    pub breaks: crate::breaks::Config,
    /// Keep the pill on top of fullscreen apps (videos, games). Off: it hides.
    pub show_over_fullscreen: bool,
    /// Also give per-app time to the app on top of each other screen.
    /// None means automatic: on while more than one screen is connected.
    pub other_screens: Option<bool>,
    /// Leave the pill, its cards and the alert flash out of screen recordings,
    /// screenshots and screen sharing (you still see them). Off by default.
    pub hide_from_capture: bool,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            retention_days: DEFAULT_RETENTION,
            limit_ms: None,
            battery_quit: false,
            battery_threshold: crate::battery::DEFAULT_THRESHOLD,
            breaks: crate::breaks::Config::default(),
            show_over_fullscreen: false,
            other_screens: None,
            hide_from_capture: false,
        }
    }
}

pub struct Store {
    root: PathBuf,
}

impl Store {
    pub fn new(root: PathBuf) -> Self {
        Self { root }
    }

    fn history_dir(&self) -> PathBuf {
        self.root.join("history")
    }

    fn day_file(&self, day: &str) -> PathBuf {
        self.history_dir().join(format!("{day}.json"))
    }

    pub fn load_day(&self, day: &str) -> Day {
        read_json(&self.day_file(day)).unwrap_or_else(|| Day { day: day.to_string(), ..Day::default() })
    }

    pub fn save_day(&self, day: &Day) {
        write_json(&self.day_file(&day.day), day);
    }

    /// The `count` days ending with `today`, oldest first. Days with no file
    /// come back empty, so a chart always gets one entry per day.
    pub fn last_days(&self, today: &str, count: u32) -> Vec<Day> {
        let Some(end) = parse(today) else { return Vec::new() };
        (0..count)
            .rev()
            .filter_map(|back| end.checked_sub_days(Days::new(back.into())))
            .map(|date| self.load_day(&date.to_string()))
            .collect()
    }

    /// Delete day files older than `keep_days` (today counts as one).
    pub fn prune(&self, today: &str, keep_days: u32) {
        let Some(end) = parse(today) else { return };
        let Some(oldest_kept) = end.checked_sub_days(Days::new(u64::from(keep_days.saturating_sub(1)))) else {
            return;
        };
        for (path, date) in self.day_files() {
            if date < oldest_kept {
                let _ = fs::remove_file(path);
            }
        }
    }

    /// Delete every day file. Settings are kept.
    pub fn clear(&self) {
        for (path, _) in self.day_files() {
            let _ = fs::remove_file(path);
        }
    }

    /// Only files named like a date are touched; anything else is left alone.
    fn day_files(&self) -> Vec<(PathBuf, NaiveDate)> {
        let Ok(entries) = fs::read_dir(self.history_dir()) else { return Vec::new() };
        entries
            .flatten()
            .filter_map(|e| {
                let path = e.path();
                let stem = path.file_stem()?.to_str()?.to_string();
                (path.extension()? == "json").then_some(())?;
                Some((path, parse(&stem)?))
            })
            .collect()
    }

    /// One-time move from the first format, a single today.json with
    /// {"day","ms"}: today's total carries over (it had no per-app data).
    pub fn migrate_today_json(&self, today: &str) {
        #[derive(Deserialize)]
        struct Old {
            day: String,
            ms: u64,
        }
        let old_file = self.root.join("today.json");
        let Some(old) = read_json::<Old>(&old_file) else { return };
        if old.day == today && !self.day_file(today).exists() {
            self.save_day(&Day { day: old.day, total_ms: old.ms, apps: HashMap::new() });
        }
        let _ = fs::remove_file(old_file);
    }

    pub fn load_settings(&self) -> Settings {
        let mut s: Settings = read_json(&self.root.join("settings.json")).unwrap_or_default();
        if !RETENTION_CHOICES.contains(&s.retention_days) {
            s.retention_days = DEFAULT_RETENTION;
        }
        if !crate::battery::THRESHOLD_CHOICES.contains(&s.battery_threshold) {
            s.battery_threshold = crate::battery::DEFAULT_THRESHOLD;
        }
        s.breaks = s.breaks.sanitized();
        s
    }

    pub fn save_settings(&self, settings: &Settings) {
        write_json(&self.root.join("settings.json"), settings);
    }
}

fn parse(day: &str) -> Option<NaiveDate> {
    NaiveDate::parse_from_str(day, "%Y-%m-%d").ok()
}

fn read_json<T: for<'de> Deserialize<'de>>(file: &Path) -> Option<T> {
    serde_json::from_str(&fs::read_to_string(file).ok()?).ok()
}

/// Write to a temp file, then rename: a crash mid-write cannot corrupt the old file.
fn write_json<T: Serialize>(file: &Path, value: &T) {
    let Ok(json) = serde_json::to_string_pretty(value) else { return };
    if let Some(dir) = file.parent() {
        let _ = fs::create_dir_all(dir);
    }
    let tmp = file.with_extension("json.tmp");
    if fs::write(&tmp, json).is_ok() {
        let _ = fs::rename(&tmp, file);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_store(name: &str) -> Store {
        let dir = std::env::temp_dir().join(format!("serion-test-{name}-{}", std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        Store::new(dir)
    }

    fn day(d: &str, ms: u64) -> Day {
        Day { day: d.into(), total_ms: ms, apps: HashMap::new() }
    }

    #[test]
    fn days_round_trip_and_missing_days_are_empty() {
        let s = temp_store("roundtrip");
        s.save_day(&day("2026-10-24", 5_000));
        s.save_day(&day("2026-10-26", 9_000));
        let days = s.last_days("2026-10-26", 3);
        assert_eq!(days.iter().map(|d| d.total_ms).collect::<Vec<_>>(), vec![5_000, 0, 9_000]);
        assert_eq!(days[1].day, "2026-10-25");
    }

    #[test]
    fn prune_keeps_exactly_the_window() {
        let s = temp_store("prune");
        for d in ["2026-10-19", "2026-10-20", "2026-10-26"] {
            s.save_day(&day(d, 1));
        }
        s.prune("2026-10-26", 7); // keeps 10-20 through 10-26
        assert_eq!(s.load_day("2026-10-19").total_ms, 0);
        assert_eq!(s.load_day("2026-10-20").total_ms, 1);
        assert_eq!(s.load_day("2026-10-26").total_ms, 1);
    }

    #[test]
    fn clear_removes_days_but_not_settings() {
        let s = temp_store("clear");
        s.save_day(&day("2026-10-26", 1));
        s.save_settings(&Settings { retention_days: 365, limit_ms: Some(7_200_000), ..Settings::default() });
        s.clear();
        assert_eq!(s.load_day("2026-10-26").total_ms, 0);
        assert_eq!(s.load_settings().retention_days, 365);
    }

    #[test]
    fn invalid_settings_fall_back_to_defaults() {
        let s = temp_store("settings");
        s.save_settings(&Settings { retention_days: 3, battery_threshold: 7, ..Settings::default() });
        let loaded = s.load_settings();
        assert_eq!(loaded.retention_days, DEFAULT_RETENTION);
        assert_eq!(loaded.battery_threshold, crate::battery::DEFAULT_THRESHOLD);
        assert!(!loaded.battery_quit);
    }
}
