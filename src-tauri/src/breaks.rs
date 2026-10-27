//! Water, stretch and eye breaks. Pure logic, unit tested; the loop in
//! lib.rs feeds it once a second.
//!
//! Each break you switch on comes due after its own amount of *counted
//! screen time*. Due breaks are offered, not forced: they wait on the pill
//! until you start one (or skip it). Only a started break pauses screen time.

use serde::{Deserialize, Serialize};

/// How often a break can come: every 5 to 240 minutes of screen time.
pub const EVERY_RANGE: std::ops::RangeInclusive<u32> = 5..=240;
/// How long a break can last: 10 seconds to 30 minutes.
pub const SECONDS_RANGE: std::ops::RangeInclusive<u32> = 10..=1800;

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Kind {
    Water,
    Stretch,
    Eyes,
}

const KINDS: [Kind; 3] = [Kind::Water, Kind::Stretch, Kind::Eyes];

/// Every break setting, as saved and as sent from the dashboard.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(default)]
pub struct Config {
    /// Minutes of screen time between breaks; None turns that break off.
    pub water_every: Option<u32>,
    pub stretch_every: Option<u32>,
    pub eye_every: Option<u32>,
    /// How long each break lasts, in seconds.
    pub water_seconds: u32,
    pub stretch_seconds: u32,
    pub eye_seconds: u32,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            water_every: None,
            stretch_every: None,
            eye_every: None,
            water_seconds: 60,
            stretch_seconds: 180,
            eye_seconds: 20,
        }
    }
}

impl Config {
    fn every(&self, kind: Kind) -> Option<u32> {
        match kind {
            Kind::Water => self.water_every,
            Kind::Stretch => self.stretch_every,
            Kind::Eyes => self.eye_every,
        }
    }

    fn seconds(&self, kind: Kind) -> u32 {
        match kind {
            Kind::Water => self.water_seconds,
            Kind::Stretch => self.stretch_seconds,
            Kind::Eyes => self.eye_seconds,
        }
    }

    pub fn every_ms(&self, kind: Kind) -> Option<u64> {
        self.every(kind).map(|m| u64::from(m) * 60_000)
    }

    pub fn length_ms(&self, kind: Kind) -> u64 {
        u64::from(self.seconds(kind)) * 1000
    }

    /// Reject values out of range, and two switched-on breaks sharing an interval.
    pub fn validate(&self) -> Result<(), String> {
        for kind in KINDS {
            if self.every(kind).is_some_and(|m| !EVERY_RANGE.contains(&m)) {
                return Err(format!("a break comes every {} to {} minutes", EVERY_RANGE.start(), EVERY_RANGE.end()));
            }
            if !SECONDS_RANGE.contains(&self.seconds(kind)) {
                return Err(format!("a break lasts {} to {} seconds", SECONDS_RANGE.start(), SECONDS_RANGE.end()));
            }
        }
        let on: Vec<u32> = KINDS.iter().filter_map(|&k| self.every(k)).collect();
        if (1..on.len()).any(|i| on[..i].contains(&on[i])) {
            return Err("two breaks cannot use the same interval".into());
        }
        Ok(())
    }

    /// A saved config that no longer validates falls back to all breaks off,
    /// keeping lengths that are still in range.
    pub fn sanitized(self) -> Self {
        if self.validate().is_ok() {
            return self;
        }
        let d = Config::default();
        let keep = |s: u32, default: u32| if SECONDS_RANGE.contains(&s) { s } else { default };
        Config {
            water_seconds: keep(self.water_seconds, d.water_seconds),
            stretch_seconds: keep(self.stretch_seconds, d.stretch_seconds),
            eye_seconds: keep(self.eye_seconds, d.eye_seconds),
            ..d
        }
    }
}

/// The break that is running.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Active {
    pub kind: Kind,
    pub left_ms: u64,
    pub length_ms: u64,
}

#[derive(Default)]
pub struct Breaks {
    since_ms: [u64; 3],
    /// Due breaks waiting for you to start or skip them, in the order they came.
    pub offered: Vec<Kind>,
    pub active: Option<Active>,
}

fn slot(kind: Kind) -> usize {
    kind as usize
}

impl Breaks {
    /// `counted_ms`: screen time counted this tick. `elapsed_ms`: wall time.
    pub fn tick(&mut self, counted_ms: u64, elapsed_ms: u64, config: &Config) {
        if let Some(mut active) = self.active {
            active.left_ms = active.left_ms.saturating_sub(elapsed_ms);
            self.active = (active.left_ms > 0).then_some(active);
            return;
        }
        for kind in KINDS {
            let Some(every) = config.every_ms(kind) else {
                self.since_ms[slot(kind)] = 0;
                continue;
            };
            if self.offered.contains(&kind) {
                continue; // already waiting on the pill
            }
            self.since_ms[slot(kind)] += counted_ms;
            if self.since_ms[slot(kind)] >= every {
                self.offered.push(kind);
            }
        }
        // A break switched off while offered is withdrawn.
        self.offered.retain(|&k| config.every(k).is_some());
    }

    /// Start an offered break. Any other offer is skipped: you chose this one.
    pub fn start(&mut self, kind: Kind, config: &Config) -> bool {
        if self.active.is_some() || !self.offered.contains(&kind) {
            return false;
        }
        for other in std::mem::take(&mut self.offered) {
            self.since_ms[slot(other)] = 0;
        }
        let length_ms = config.length_ms(kind);
        self.active = Some(Active { kind, left_ms: length_ms, length_ms });
        true
    }

    /// Not now: drop the offer; it comes back after its full interval.
    pub fn skip(&mut self, kind: Kind) {
        if let Some(i) = self.offered.iter().position(|&k| k == kind) {
            self.offered.remove(i);
            self.since_ms[slot(kind)] = 0;
        }
    }

    /// You were away (idle, locked or asleep) for `away_ms`: every break that
    /// short or shorter counts as taken. Its timer restarts and its offer goes.
    pub fn away(&mut self, away_ms: u64, config: &Config) {
        for kind in KINDS {
            if config.every(kind).is_some() && config.length_ms(kind) <= away_ms {
                self.since_ms[slot(kind)] = 0;
                self.offered.retain(|&k| k != kind);
            }
        }
    }

    /// End the running break early: Done.
    pub fn finish(&mut self) {
        self.active = None;
    }

    /// Screen time is paused only while a started break runs.
    pub fn pausing(&self) -> bool {
        self.active.is_some()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const SEC: u64 = 1_000;
    const MIN: u64 = 60 * SEC;

    fn config() -> Config {
        Config { eye_every: Some(25), water_every: Some(60), ..Config::default() }
    }

    #[test]
    fn a_due_break_is_offered_and_waits_without_pausing() {
        let mut b = Breaks::default();
        let c = config();
        b.tick(25 * MIN - SEC, SEC, &c);
        assert!(b.offered.is_empty());
        b.tick(SEC, SEC, &c);
        assert_eq!(b.offered, vec![Kind::Eyes]);
        assert!(!b.pausing());
        // Ignored: it stays offered, not offered twice.
        b.tick(10 * MIN, SEC, &c);
        assert_eq!(b.offered, vec![Kind::Eyes]);
    }

    #[test]
    fn starting_pauses_for_its_length_then_ends() {
        let mut b = Breaks::default();
        let c = Config { eye_seconds: 30, ..config() };
        b.tick(25 * MIN, SEC, &c);
        assert!(b.start(Kind::Eyes, &c));
        assert!(b.pausing());
        assert!(b.offered.is_empty());
        for _ in 0..29 {
            b.tick(0, SEC, &c);
        }
        assert!(b.pausing());
        b.tick(0, SEC, &c);
        assert!(!b.pausing());
    }

    #[test]
    fn two_due_at_once_are_both_offered_and_you_pick_one() {
        let mut b = Breaks::default();
        let c = Config { eye_every: Some(20), water_every: Some(60), ..Config::default() };
        b.tick(20 * MIN, SEC, &c); // eyes due alone
        b.skip(Kind::Eyes);
        b.tick(40 * MIN, SEC, &c); // minute 60: eyes and water both come due
        assert_eq!(b.offered.len(), 2);
        assert!(b.start(Kind::Water, &c));
        assert!(b.offered.is_empty());
        assert_eq!(b.active.map(|a| a.kind), Some(Kind::Water));
    }

    #[test]
    fn skip_restarts_that_break_and_cannot_start_what_is_not_offered() {
        let mut b = Breaks::default();
        let c = config();
        assert!(!b.start(Kind::Eyes, &c));
        b.tick(25 * MIN, SEC, &c);
        b.skip(Kind::Eyes);
        assert!(b.offered.is_empty());
        b.tick(24 * MIN, SEC, &c);
        assert!(b.offered.is_empty());
        b.tick(MIN, SEC, &c);
        assert_eq!(b.offered, vec![Kind::Eyes]);
    }

    #[test]
    fn uncounted_time_brings_nothing_and_off_breaks_never_come() {
        let mut b = Breaks::default();
        for _ in 0..3600 {
            b.tick(0, SEC, &config());
        }
        assert!(b.offered.is_empty());
        b.tick(10 * 60 * MIN, SEC, &Config::default());
        assert!(b.offered.is_empty());
    }

    #[test]
    fn switching_a_break_off_withdraws_its_offer() {
        let mut b = Breaks::default();
        b.tick(25 * MIN, SEC, &config());
        b.tick(0, SEC, &Config { eye_every: None, ..config() });
        assert!(b.offered.is_empty());
    }

    #[test]
    fn being_away_long_enough_counts_as_the_break() {
        let mut b = Breaks::default();
        let c = Config { stretch_every: Some(90), stretch_seconds: 600, ..config() }; // eyes 20 s, stretch 10 min
        b.tick(25 * MIN, SEC, &c);
        assert_eq!(b.offered, vec![Kind::Eyes]);
        b.away(6 * MIN, &c); // a 6-minute absence covers the eye break, not the stretch
        assert!(b.offered.is_empty());
        b.tick(24 * MIN, SEC, &c);
        assert!(b.offered.is_empty(), "eye timer restarted after the absence");
        b.tick(41 * MIN, SEC, &c); // stretch reaches its 90 minutes
        assert!(b.offered.contains(&Kind::Stretch));
    }

    #[test]
    fn validation_rejects_shared_intervals_and_out_of_range_values() {
        assert!(config().validate().is_ok());
        assert!(Config { water_every: Some(25), ..config() }.validate().is_err());
        assert!(Config { eye_every: Some(4), ..Config::default() }.validate().is_err());
        assert!(Config { stretch_seconds: 5, ..Config::default() }.validate().is_err());
        // Off breaks may keep any interval value: only switched-on ones count.
        let saved = Config { water_every: Some(25), ..config() }.sanitized();
        assert_eq!((saved.water_every, saved.eye_every), (None, None));
    }
}
