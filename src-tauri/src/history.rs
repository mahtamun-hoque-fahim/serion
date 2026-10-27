//! Day history on disk: one encrypted file per day, plus encrypted settings.
//!
//! Layout inside the data folder (the default app data folder, or one you chose):
//!   history/2026-10-26.srn   a Day: {"day","total_ms","apps":{exe:{name,ms}}}
//!   settings.srn             Settings
//! Every file is sealed by crypto.rs: unreadable by hand, and refused if changed.
//! Files from before encryption (.json) are read once and rewritten sealed.

use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

use chrono::{Days, NaiveDate};
use serde::{Deserialize, Serialize};

use crate::crypto;
use crate::tracker::AppTime;

/// How long history may be kept, in days: 7 days up to 5 years.
pub const RETENTION_CHOICES: [u32; 7] = [7, 30, 90, 180, 365, 730, 1825];
const DEFAULT_RETENTION: u32 = 30;
const DAY_MS: u64 = 24 * 60 * 60 * 1000;
/// Remembers a data folder you chose; lives in the default app data folder.
const LOCATION_FILE: &str = "data-folder.txt";

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

impl Settings {
    /// Bring saved or imported settings back within the allowed choices.
    fn sanitized(mut self) -> Self {
        if !RETENTION_CHOICES.contains(&self.retention_days) {
            self.retention_days = DEFAULT_RETENTION;
        }
        if !crate::battery::THRESHOLD_CHOICES.contains(&self.battery_threshold) {
            self.battery_threshold = crate::battery::DEFAULT_THRESHOLD;
        }
        if self.limit_ms.is_some_and(|l| l == 0 || l > DAY_MS) {
            self.limit_ms = None;
        }
        self.breaks = self.breaks.sanitized();
        self
    }
}

/// How an import combines with what is already here.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ImportMode {
    /// Keep everything; for days in both, keep the higher numbers.
    KeepHigher,
    /// Keep everything; for days in both, take the file's numbers.
    PreferFile,
    /// Delete all history here first, and take the file's settings too.
    Replace,
}

/// The contents of an export file.
#[derive(Serialize, Deserialize)]
pub struct Bundle {
    format: String,
    version: u32,
    pub settings: Settings,
    pub days: Vec<Day>,
}

const BUNDLE_FORMAT: &str = "serion-export";
const BUNDLE_VERSION: u32 = 1;

/// Combine one day from an import with the same day here.
pub fn merge_day(here: &Day, incoming: &Day, mode: ImportMode) -> Day {
    if mode != ImportMode::KeepHigher {
        return incoming.clone();
    }
    let mut apps = here.apps.clone();
    for (exe, time) in &incoming.apps {
        let entry = apps.entry(exe.clone()).or_insert_with(|| time.clone());
        if time.ms > entry.ms {
            *entry = time.clone();
        }
    }
    Day { day: here.day.clone(), total_ms: here.total_ms.max(incoming.total_ms), apps }
}

/// Reject days that cannot be real: bad dates, the future, more than 24 hours.
fn validate_day(day: &Day, today: &str) -> Result<(), String> {
    let date = parse(&day.day).ok_or_else(|| format!("\"{}\" is not a date", day.day))?;
    if parse(today).is_some_and(|t| date > t) {
        return Err(format!("{} is in the future", day.day));
    }
    if day.total_ms > DAY_MS || day.apps.values().any(|a| a.ms > DAY_MS) {
        return Err(format!("{} has more than 24 hours", day.day));
    }
    if day.apps.len() > 5000 || day.apps.iter().any(|(exe, a)| exe.len() > 260 || a.name.len() > 260) {
        return Err(format!("{} has app entries that are not valid", day.day));
    }
    Ok(())
}

/// Open an export file: refused if it is not a Serion export, was changed, or
/// holds values that cannot be real.
pub fn open_bundle(bytes: &[u8], today: &str) -> Result<Bundle, String> {
    let plain = crypto::open(bytes).ok_or("This is not a Serion export, or it was changed after exporting.")?;
    let bundle: Bundle =
        serde_json::from_slice(&plain).map_err(|_| "This export is damaged and cannot be read.".to_string())?;
    if bundle.format != BUNDLE_FORMAT || bundle.version > BUNDLE_VERSION {
        return Err("This export comes from a newer or different app.".into());
    }
    for day in &bundle.days {
        validate_day(day, today)?;
    }
    Ok(Bundle { settings: bundle.settings.sanitized(), ..bundle })
}

pub struct Store {
    root: Mutex<PathBuf>,
}

impl Store {
    pub fn new(root: PathBuf) -> Self {
        Self { root: Mutex::new(root) }
    }

    /// The data folder in use: the one you chose, else `default`.
    pub fn locate(default: &Path) -> PathBuf {
        fs::read_to_string(default.join(LOCATION_FILE))
            .ok()
            .map(|s| PathBuf::from(s.trim()))
            .filter(|p| !p.as_os_str().is_empty())
            .unwrap_or_else(|| default.to_path_buf())
    }

    pub fn root(&self) -> PathBuf {
        self.root.lock().unwrap_or_else(|e| e.into_inner()).clone()
    }

    fn history_dir(&self) -> PathBuf {
        self.root().join("history")
    }

    /// A day's file path without its extension.
    fn day_base(&self, day: &str) -> PathBuf {
        self.history_dir().join(day)
    }

    pub fn load_day(&self, day: &str) -> Day {
        read(&self.day_base(day)).unwrap_or_else(|| Day { day: day.to_string(), ..Day::default() })
    }

    /// False when the data folder cannot be written (for example a removed drive).
    pub fn save_day(&self, day: &Day) -> bool {
        write(&self.day_base(&day.day), day)
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
        let Some(oldest_kept) = oldest_kept(today, keep_days) else { return };
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
                let ext = path.extension()?.to_str()?;
                if ext != "srn" && ext != "json" {
                    return None;
                }
                let date = parse(path.file_stem()?.to_str()?)?;
                Some((path, date))
            })
            .collect()
    }

    /// Seal every day file still in plain JSON from before encryption, so no
    /// readable file is left behind (not only the days you happen to open).
    pub fn seal_legacy(&self) {
        for (path, _) in self.day_files() {
            if path.extension().is_some_and(|e| e == "json") {
                let _ = read::<Day>(&path.with_extension(""));
            }
        }
    }

    /// One-time move from the first format, a single plain today.json with
    /// {"day","ms"}: today's total carries over (it had no per-app data).
    pub fn migrate_today_json(&self, today: &str) {
        #[derive(Deserialize)]
        struct Old {
            day: String,
            ms: u64,
        }
        let old_file = self.root().join("today.json");
        let Some(old) = fs::read(&old_file).ok().and_then(|b| serde_json::from_slice::<Old>(&b).ok()) else {
            return;
        };
        if old.day == today && read::<Day>(&self.day_base(today)).is_none() {
            self.save_day(&Day { day: old.day, total_ms: old.ms, apps: HashMap::new() });
        }
        let _ = fs::remove_file(old_file);
    }

    pub fn load_settings(&self) -> Settings {
        read::<Settings>(&self.root().join("settings")).unwrap_or_default().sanitized()
    }

    pub fn save_settings(&self, settings: &Settings) -> bool {
        write(&self.root().join("settings"), settings)
    }

    /// Everything here, sealed into one export file. `today` is the live day
    /// from memory, which replaces its (possibly older) copy on disk.
    /// Returns the file bytes and how many days they hold.
    pub fn export(&self, settings: &Settings, today: &Day) -> (Vec<u8>, usize) {
        let mut days: Vec<Day> = self
            .day_files()
            .into_iter()
            .filter(|(_, date)| date.to_string() != today.day)
            .filter_map(|(path, _)| read::<Day>(&path.with_extension("")))
            .collect();
        days.push(today.clone());
        days.sort_by(|a, b| a.day.cmp(&b.day));
        let count = days.len();
        let bundle = Bundle { format: BUNDLE_FORMAT.into(), version: BUNDLE_VERSION, settings: settings.clone(), days };
        (crypto::seal(&serde_json::to_vec(&bundle).expect("plain data always serializes")), count)
    }

    /// Write an opened bundle's days here. Days older than the history limit
    /// are skipped (they would be deleted straight away). Returns the days
    /// written and the days skipped.
    pub fn import(&self, bundle: &Bundle, mode: ImportMode, today: &str, retention: u32) -> (usize, usize) {
        if mode == ImportMode::Replace {
            self.clear();
        }
        let oldest = oldest_kept(today, retention);
        let (mut written, mut skipped) = (0, 0);
        for day in &bundle.days {
            if oldest.is_some_and(|o| parse(&day.day).is_some_and(|d| d < o)) {
                skipped += 1;
                continue;
            }
            let merged = merge_day(&self.load_day(&day.day), day, mode);
            if self.save_day(&merged) {
                written += 1;
            }
        }
        (written, skipped)
    }

    /// Switch to another data folder. `move_data`: bring every Serion file
    /// along (each copy is checked before the original is removed); otherwise
    /// start fresh there, keeping only the settings.
    pub fn move_to(&self, new_root: &Path, default: &Path, move_data: bool, settings: &Settings) -> Result<(), String> {
        let old_root = self.root();
        if new_root == old_root {
            return Ok(());
        }
        fs::create_dir_all(new_root.join("history")).map_err(|e| format!("Cannot use that folder: {e}"))?;
        let probe = new_root.join(".serion-write-test");
        fs::write(&probe, b"ok").map_err(|e| format!("Cannot write to that folder: {e}"))?;
        let _ = fs::remove_file(probe);

        let mut moved = Vec::new();
        if move_data {
            let mut files: Vec<PathBuf> = self.day_files().into_iter().map(|(p, _)| p).collect();
            files.extend(["settings.srn", "settings.json"].map(|f| old_root.join(f)).into_iter().filter(|p| p.exists()));
            for from in &files {
                let relative = from.strip_prefix(&old_root).map_err(|_| "Unexpected file path".to_string())?;
                let to = new_root.join(relative);
                let bytes = fs::read(from).map_err(|e| format!("Cannot read {}: {e}", from.display()))?;
                fs::write(&to, &bytes).map_err(|e| format!("Cannot write {}: {e}", to.display()))?;
                if fs::read(&to).ok().as_deref() != Some(bytes.as_slice()) {
                    return Err(format!("Copy of {} did not check out; nothing was removed.", from.display()));
                }
                moved.push(from.clone());
            }
        }
        *self.root.lock().unwrap_or_else(|e| e.into_inner()) = new_root.to_path_buf();
        if !move_data {
            self.save_settings(settings);
        }
        // Only after every copy checked out: remove the originals.
        for from in moved {
            let _ = fs::remove_file(from);
        }
        let pointer = default.join(LOCATION_FILE);
        if new_root == default {
            let _ = fs::remove_file(pointer);
        } else {
            let _ = fs::create_dir_all(default);
            fs::write(pointer, new_root.to_string_lossy().as_bytes()).map_err(|e| format!("Cannot remember the folder: {e}"))?;
        }
        Ok(())
    }
}

fn parse(day: &str) -> Option<NaiveDate> {
    NaiveDate::parse_from_str(day, "%Y-%m-%d").ok()
}

fn oldest_kept(today: &str, keep_days: u32) -> Option<NaiveDate> {
    parse(today)?.checked_sub_days(Days::new(u64::from(keep_days.saturating_sub(1))))
}

/// Read `base.srn` (sealed). Falls back to an old plain `base.json`, which is
/// then rewritten sealed and removed.
fn read<T: Serialize + for<'de> Deserialize<'de>>(base: &Path) -> Option<T> {
    if let Ok(bytes) = fs::read(base.with_extension("srn")) {
        return serde_json::from_slice(&crypto::open(&bytes)?).ok();
    }
    let legacy = base.with_extension("json");
    let value: T = serde_json::from_slice(&fs::read(&legacy).ok()?).ok()?;
    if write(base, &value) {
        let _ = fs::remove_file(legacy);
    }
    Some(value)
}

/// Seal and write `base.srn` via a temp file and rename, so a crash mid-write
/// cannot corrupt the old file. False if the folder cannot be written.
fn write<T: Serialize>(base: &Path, value: &T) -> bool {
    let Ok(json) = serde_json::to_vec(value) else { return false };
    if let Some(dir) = base.parent() {
        let _ = fs::create_dir_all(dir);
    }
    let file = base.with_extension("srn");
    let tmp = base.with_extension("srn.tmp");
    fs::write(&tmp, crypto::seal(&json)).is_ok() && fs::rename(&tmp, &file).is_ok()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_dir(name: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!("serion-test-{name}-{}", std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        dir
    }

    fn temp_store(name: &str) -> Store {
        Store::new(temp_dir(name))
    }

    fn day(d: &str, ms: u64) -> Day {
        Day { day: d.into(), total_ms: ms, apps: HashMap::new() }
    }

    fn with_app(d: &str, ms: u64, exe: &str, app_ms: u64) -> Day {
        let mut day = day(d, ms);
        day.apps.insert(exe.into(), AppTime { name: exe.into(), ms: app_ms });
        day
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
    fn files_on_disk_are_unreadable() {
        let s = temp_store("sealed");
        s.save_day(&with_app("2026-10-26", 9_000, "firefox.exe", 9_000));
        let raw = fs::read(s.root().join("history").join("2026-10-26.srn")).unwrap();
        assert!(!String::from_utf8_lossy(&raw).contains("firefox"));
    }

    #[test]
    fn old_plain_json_is_read_then_sealed() {
        let s = temp_store("legacy");
        fs::create_dir_all(s.root().join("history")).unwrap();
        fs::write(s.root().join("history").join("2026-10-26.json"), r#"{"day":"2026-10-26","total_ms":7,"apps":{}}"#).unwrap();
        assert_eq!(s.load_day("2026-10-26").total_ms, 7);
        assert!(!s.root().join("history").join("2026-10-26.json").exists());
        assert!(s.root().join("history").join("2026-10-26.srn").exists());
    }

    #[test]
    fn startup_seals_every_old_plain_day() {
        let s = temp_store("seal-all");
        let dir = s.root().join("history");
        fs::create_dir_all(&dir).unwrap();
        for d in ["2026-10-20", "2026-10-26"] {
            fs::write(dir.join(format!("{d}.json")), format!(r#"{{"day":"{d}","total_ms":3,"apps":{{}}}}"#)).unwrap();
        }
        s.seal_legacy();
        assert!(fs::read_dir(&dir).unwrap().flatten().all(|e| e.path().extension().unwrap() == "srn"));
        assert_eq!(s.load_day("2026-10-20").total_ms, 3);
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

    #[test]
    fn export_then_import_with_each_mode() {
        let source = temp_store("export-src");
        source.save_day(&with_app("2026-10-25", 5_000, "code.exe", 5_000));
        let (file, count) = source.export(&Settings::default(), &with_app("2026-10-26", 9_000, "firefox.exe", 9_000));
        assert_eq!(count, 2);
        let bundle = open_bundle(&file, "2026-10-26").unwrap();
        assert_eq!(bundle.days.len(), 2);

        let target = temp_store("export-dst");
        target.save_day(&with_app("2026-10-26", 12_000, "firefox.exe", 12_000));
        target.import(&bundle, ImportMode::KeepHigher, "2026-10-26", 30);
        assert_eq!(target.load_day("2026-10-26").total_ms, 12_000, "higher kept");
        assert_eq!(target.load_day("2026-10-25").total_ms, 5_000, "missing day added");
        target.import(&bundle, ImportMode::PreferFile, "2026-10-26", 30);
        assert_eq!(target.load_day("2026-10-26").total_ms, 9_000, "file wins");

        target.save_day(&day("2026-10-20", 1));
        target.import(&bundle, ImportMode::Replace, "2026-10-26", 30);
        assert_eq!(target.load_day("2026-10-20").total_ms, 0, "replace removes days not in the file");
    }

    #[test]
    fn changed_foreign_or_impossible_exports_are_refused() {
        let s = temp_store("refuse");
        let (mut file, _) = s.export(&Settings::default(), &day("2026-10-26", 1_000));
        let at = file.len() / 2;
        file[at] ^= 1;
        assert!(open_bundle(&file, "2026-10-26").is_err(), "changed");
        assert!(open_bundle(br#"{"format":"serion-export"}"#, "2026-10-26").is_err(), "plain text");

        let (too_long, _) = s.export(&Settings::default(), &day("2026-10-26", DAY_MS + 1));
        assert!(open_bundle(&too_long, "2026-10-26").is_err(), "more than 24 h");
        let (future, _) = s.export(&Settings::default(), &day("2027-01-01", 1));
        assert!(open_bundle(&future, "2026-10-26").is_err(), "future day");
    }

    #[test]
    fn import_skips_days_older_than_the_history_limit() {
        let s = temp_store("old");
        let bundle = Bundle { format: BUNDLE_FORMAT.into(), version: 1, settings: Settings::default(), days: vec![day("2026-01-01", 1), day("2026-10-26", 2)] };
        assert_eq!(s.import(&bundle, ImportMode::KeepHigher, "2026-10-26", 30), (1, 1));
    }

    #[test]
    fn moving_the_data_folder_brings_everything_and_is_remembered() {
        let default = temp_dir("move-default");
        let s = Store::new(default.clone());
        s.save_day(&day("2026-10-26", 4_000));
        s.save_settings(&Settings { retention_days: 365, ..Settings::default() });
        let elsewhere = temp_dir("move-target");
        s.move_to(&elsewhere, &default, true, &Settings::default()).unwrap();
        assert_eq!(s.load_day("2026-10-26").total_ms, 4_000);
        assert_eq!(s.load_settings().retention_days, 365);
        assert!(!default.join("history").join("2026-10-26.srn").exists(), "original removed");
        assert_eq!(Store::locate(&default), elsewhere);

        // Fresh start elsewhere: no history, settings carried over.
        let fresh = temp_dir("move-fresh");
        s.move_to(&fresh, &default, false, &Settings { retention_days: 90, ..Settings::default() }).unwrap();
        assert_eq!(s.load_day("2026-10-26").total_ms, 0);
        assert_eq!(s.load_settings().retention_days, 90);
    }
}
