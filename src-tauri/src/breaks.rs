//! Water, stretch and eye breaks. Pure logic, unit tested; the loop in
//! lib.rs feeds it once a second.
//!
//! A break comes due after a set amount of *counted screen time* (not clock
//! time), so idle or desktop-only time never brings one sooner. While a
//! pausing break runs, nothing is counted as screen time. The eye break can
//! also be a reminder only, which shows but does not pause counting.

use serde::{Deserialize, Serialize};

/// Minutes of screen time between water or stretch breaks.
pub const INTERVAL_CHOICES: [u32; 6] = [20, 30, 45, 60, 90, 120];
/// Minutes of screen time between eye breaks.
pub const EYE_INTERVAL_CHOICES: [u32; 4] = [20, 25, 30, 45];
/// Seconds an eye break lasts (20 s is the 20-20-20 rule).
pub const EYE_SECONDS_CHOICES: [u32; 3] = [20, 60, 120];
/// Water and stretch breaks last 1 to 30 minutes, as you set them.
pub const MAX_LENGTH_MINUTES: u32 = 30;
/// "Snooze" brings the same break back after this much more screen time.
pub const SNOOZE_MS: u64 = 5 * 60_000;
/// A reminder-only eye break shows this long.
const EYE_REMINDER_MS: u64 = 20_000;

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum Kind {
    Water,
    Stretch,
    Eyes,
}

/// Every break setting, as saved and as sent from the dashboard.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(default)]
pub struct Config {
    /// Minutes of screen time between breaks; None turns that break off.
    pub water_every: Option<u32>,
    pub stretch_every: Option<u32>,
    pub eye_every: Option<u32>,
    /// How long water and stretch breaks last, in minutes.
    pub water_minutes: u32,
    pub stretch_minutes: u32,
    /// Eye break: pause screen time for eye_seconds, or only remind.
    pub eye_pause: bool,
    pub eye_seconds: u32,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            water_every: None,
            stretch_every: None,
            eye_every: None,
            water_minutes: 1,
            stretch_minutes: 3,
            eye_pause: false,
            eye_seconds: 20,
        }
    }
}

impl Config {
    /// Reject anything outside the offered choices (input from the UI).
    pub fn validate(&self) -> Result<(), String> {
        let in_list = |m: Option<u32>, list: &[u32]| m.is_none_or(|m| list.contains(&m));
        let length_ok = |m: u32| (1..=MAX_LENGTH_MINUTES).contains(&m);
        if !in_list(self.water_every, &INTERVAL_CHOICES) || !in_list(self.stretch_every, &INTERVAL_CHOICES) {
            return Err(format!("break intervals must be one of {INTERVAL_CHOICES:?} minutes"));
        }
        if !in_list(self.eye_every, &EYE_INTERVAL_CHOICES) {
            return Err(format!("eye break interval must be one of {EYE_INTERVAL_CHOICES:?} minutes"));
        }
        if !length_ok(self.water_minutes) || !length_ok(self.stretch_minutes) {
            return Err(format!("a break lasts 1 to {MAX_LENGTH_MINUTES} minutes"));
        }
        if !EYE_SECONDS_CHOICES.contains(&self.eye_seconds) {
            return Err(format!("an eye break lasts one of {EYE_SECONDS_CHOICES:?} seconds"));
        }
        Ok(())
    }

    /// Bring a saved config back within the choices, field by field.
    pub fn sanitized(mut self) -> Self {
        let d = Config::default();
        let keep = |m: Option<u32>, list: &[u32]| m.filter(|m| list.contains(m));
        self.water_every = keep(self.water_every, &INTERVAL_CHOICES);
        self.stretch_every = keep(self.stretch_every, &INTERVAL_CHOICES);
        self.eye_every = keep(self.eye_every, &EYE_INTERVAL_CHOICES);
        if !(1..=MAX_LENGTH_MINUTES).contains(&self.water_minutes) {
            self.water_minutes = d.water_minutes;
        }
        if !(1..=MAX_LENGTH_MINUTES).contains(&self.stretch_minutes) {
            self.stretch_minutes = d.stretch_minutes;
        }
        if !EYE_SECONDS_CHOICES.contains(&self.eye_seconds) {
            self.eye_seconds = d.eye_seconds;
        }
        self
    }

    fn every_ms(&self, kind: Kind) -> Option<u64> {
        let minutes = match kind {
            Kind::Water => self.water_every,
            Kind::Stretch => self.stretch_every,
            Kind::Eyes => self.eye_every,
        };
        minutes.map(|m| u64::from(m) * 60_000)
    }

    fn length_ms(&self, kind: Kind) -> u64 {
        match kind {
            Kind::Water => u64::from(self.water_minutes) * 60_000,
            Kind::Stretch => u64::from(self.stretch_minutes) * 60_000,
            Kind::Eyes if self.eye_pause => u64::from(self.eye_seconds) * 1000,
            Kind::Eyes => EYE_REMINDER_MS,
        }
    }
}

/// The running break.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Active {
    pub kind: Kind,
    pub left_ms: u64,
    pub length_ms: u64,
    /// Screen time is not counted while it runs.
    pub pauses: bool,
}

#[derive(Default)]
pub struct Breaks {
    since_water_ms: u64,
    since_stretch_ms: u64,
    since_eyes_ms: u64,
    pub active: Option<Active>,
}

impl Breaks {
    /// `counted_ms`: screen time counted this tick. `elapsed_ms`: wall time.
    /// Returns the break that started on this tick, if one did.
    pub fn tick(&mut self, counted_ms: u64, elapsed_ms: u64, config: &Config) -> Option<Kind> {
        if let Some(mut active) = self.active {
            active.left_ms = active.left_ms.saturating_sub(elapsed_ms);
            self.active = (active.left_ms > 0).then_some(active);
            return None;
        }
        self.since_water_ms += counted_ms;
        self.since_stretch_ms += counted_ms;
        self.since_eyes_ms += counted_ms;
        // The longer break wins a tie: you can drink or rest your eyes during
        // a stretch, so it resets the shorter ones too.
        let due = |since: u64, kind: Kind| config.every_ms(kind).is_some_and(|every| since >= every);
        let kind = if due(self.since_stretch_ms, Kind::Stretch) {
            Kind::Stretch
        } else if due(self.since_water_ms, Kind::Water) {
            Kind::Water
        } else if due(self.since_eyes_ms, Kind::Eyes) {
            Kind::Eyes
        } else {
            return None;
        };
        self.since_eyes_ms = 0;
        if kind != Kind::Eyes {
            self.since_water_ms = 0;
        }
        if kind == Kind::Stretch {
            self.since_stretch_ms = 0;
        }
        let length_ms = config.length_ms(kind);
        let pauses = kind != Kind::Eyes || config.eye_pause;
        self.active = Some(Active { kind, left_ms: length_ms, length_ms, pauses });
        Some(kind)
    }

    /// End the running break early: Done.
    pub fn finish(&mut self) {
        self.active = None;
    }

    /// End the running break and bring it back after SNOOZE_MS more screen time.
    pub fn snooze(&mut self, config: &Config) {
        let Some(active) = self.active.take() else { return };
        let since = config.every_ms(active.kind).unwrap_or(0).saturating_sub(SNOOZE_MS);
        match active.kind {
            Kind::Water => self.since_water_ms = since,
            Kind::Stretch => self.since_stretch_ms = since,
            Kind::Eyes => self.since_eyes_ms = since,
        }
    }

    /// Is screen time paused right now?
    pub fn pausing(&self) -> bool {
        self.active.is_some_and(|a| a.pauses)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const SEC: u64 = 1_000;
    const MIN: u64 = 60 * SEC;

    fn config() -> Config {
        Config { water_every: Some(30), water_minutes: 2, ..Config::default() }
    }

    #[test]
    fn water_break_after_its_screen_time_lasts_its_length() {
        let mut b = Breaks::default();
        let c = config();
        for _ in 0..(30 * 60 - 1) {
            assert_eq!(b.tick(SEC, SEC, &c), None);
        }
        assert_eq!(b.tick(SEC, SEC, &c), Some(Kind::Water));
        assert!(b.pausing());
        for _ in 0..119 {
            b.tick(SEC, SEC, &c);
        }
        assert!(b.active.is_some());
        b.tick(0, SEC, &c);
        assert_eq!(b.active, None);
    }

    #[test]
    fn uncounted_time_does_not_bring_a_break_sooner() {
        let mut b = Breaks::default();
        let c = Config { stretch_every: Some(30), eye_every: Some(20), ..config() };
        for _ in 0..(60 * 60) {
            b.tick(0, SEC, &c); // idle or desktop
        }
        assert_eq!(b.active, None);
    }

    #[test]
    fn stretch_wins_a_tie_and_resets_the_shorter_breaks() {
        let mut b = Breaks::default();
        let c = Config { stretch_every: Some(30), eye_every: Some(30), ..config() };
        assert_eq!(b.tick(30 * MIN, SEC, &c), Some(Kind::Stretch));
        assert_eq!(b.active.map(|a| a.length_ms), Some(3 * MIN));
        b.finish();
        assert_eq!(b.tick(SEC, SEC, &c), None);
    }

    #[test]
    fn eye_reminder_shows_without_pausing_unless_asked() {
        let mut b = Breaks::default();
        let reminder = Config { eye_every: Some(25), ..Config::default() };
        assert_eq!(b.tick(25 * MIN, SEC, &reminder), Some(Kind::Eyes));
        assert!(!b.pausing());
        assert_eq!(b.active.map(|a| a.length_ms), Some(20 * SEC));

        let mut b = Breaks::default();
        let pause = Config { eye_every: Some(25), eye_pause: true, eye_seconds: 60, ..Config::default() };
        b.tick(25 * MIN, SEC, &pause);
        assert!(b.pausing());
        assert_eq!(b.active.map(|a| a.length_ms), Some(MIN));
    }

    #[test]
    fn breaks_that_are_off_never_start() {
        let mut b = Breaks::default();
        assert_eq!(b.tick(10 * 60 * MIN, SEC, &Config::default()), None);
    }

    #[test]
    fn snooze_brings_the_break_back_after_five_minutes() {
        let mut b = Breaks::default();
        let c = config();
        b.tick(30 * MIN, SEC, &c);
        b.snooze(&c);
        assert_eq!(b.active, None);
        assert_eq!(b.tick(5 * MIN - SEC, SEC, &c), None);
        assert_eq!(b.tick(SEC, SEC, &c), Some(Kind::Water));
    }

    #[test]
    fn validation_and_sanitizing_hold_to_the_choices() {
        assert!(Config { water_every: Some(7), ..Config::default() }.validate().is_err());
        assert!(Config { water_minutes: 0, ..Config::default() }.validate().is_err());
        assert!(Config { eye_seconds: 5, ..Config::default() }.validate().is_err());
        assert!(config().validate().is_ok());
        let fixed = Config { eye_every: Some(7), stretch_minutes: 99, ..Config::default() }.sanitized();
        assert_eq!((fixed.eye_every, fixed.stretch_minutes), (None, 3));
    }
}
