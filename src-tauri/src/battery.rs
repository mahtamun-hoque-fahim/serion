//! Battery level, for the optional "quit when battery is low" setting.

use serde::Serialize;

/// Levels the low-battery quit can be set to, in percent.
pub const THRESHOLD_CHOICES: [u8; 4] = [10, 15, 20, 30];
pub const DEFAULT_THRESHOLD: u8 = 20;

#[derive(Clone, Copy, Debug, PartialEq, Serialize)]
pub struct Battery {
    pub percent: u8,
    /// Plugged in (charging or full).
    pub plugged: bool,
}

impl Battery {
    /// Running on battery at or below `threshold` percent.
    pub fn is_low(&self, threshold: u8) -> bool {
        !self.plugged && self.percent <= threshold
    }
}

/// Quit only when the machine *enters* the low state: unplugged at or below
/// the level, dropping to it, or starting up already below it. `was_low` is
/// None before the first reading. Being low already when the setting is
/// turned on is not an entry, so it never quits on the spot.
pub fn entered_low(was_low: Option<bool>, low_now: bool) -> bool {
    low_now && was_low != Some(true)
}

/// None on machines without a battery, or when Windows cannot tell.
#[cfg(windows)]
pub fn read() -> Option<Battery> {
    use windows_sys::Win32::System::Power::{GetSystemPowerStatus, SYSTEM_POWER_STATUS};
    // SAFETY: plain struct of integers; zeroed is a valid value and the call fills it.
    let mut status: SYSTEM_POWER_STATUS = unsafe { std::mem::zeroed() };
    if unsafe { GetSystemPowerStatus(&mut status) } == 0 {
        return None;
    }
    // BatteryFlag 128: no system battery. Percent 255: unknown.
    if status.BatteryFlag == 128 || status.BatteryLifePercent > 100 {
        return None;
    }
    Some(Battery { percent: status.BatteryLifePercent, plugged: status.ACLineStatus == 1 })
}

#[cfg(not(windows))]
pub fn read() -> Option<Battery> {
    // shortcut: battery reading is Windows-only for now; add it with the
    // macOS and Linux builds (IOKit / upower).
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn low_means_unplugged_at_or_below_the_level() {
        assert!(Battery { percent: 20, plugged: false }.is_low(20));
        assert!(!Battery { percent: 21, plugged: false }.is_low(20));
        assert!(!Battery { percent: 5, plugged: true }.is_low(20));
    }

    #[test]
    fn quits_only_on_entering_the_low_state() {
        assert!(entered_low(None, true)); // started up low
        assert!(entered_low(Some(false), true)); // dropped to the level, or unplugged
        assert!(!entered_low(Some(true), true)); // already low: no repeat, no instant quit
        assert!(!entered_low(None, false));
        assert!(!entered_low(Some(true), false)); // plugged back in
    }
}
