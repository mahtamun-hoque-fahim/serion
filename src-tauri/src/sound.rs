//! Notification chimes, played by the OS rather than the webview: a page may
//! not play sound until it has been clicked, and the pill often never is.
//! Each chime is two rising sine notes, built once as an in-memory WAV.

use std::sync::OnceLock;

const RATE: u32 = 44_100;
/// Second note starts this long after the first.
const STEP_S: f32 = 0.14;
/// Each note fades in over 15 ms, then decays like a bell over 0.9 s.
const ATTACK_S: f32 = 0.015;
const DECAY_S: f32 = 0.9;
/// An octave overtone at this share: a bare sine is easy to miss on laptop speakers.
const OVERTONE: f32 = 0.35;

#[derive(Clone, Copy)]
pub enum Chime {
    /// Daily limit, countdown: higher and firmer.
    Alert,
    /// Break offered, break finished: softer.
    Break,
}

impl Chime {
    pub fn parse(kind: &str) -> Option<Self> {
        match kind {
            "alert" => Some(Self::Alert),
            "break" => Some(Self::Break),
            _ => None,
        }
    }

    fn notes(self) -> ([f32; 2], f32) {
        match self {
            Self::Alert => ([880.0, 1318.5], 0.45),
            Self::Break => ([659.3, 880.0], 0.32),
        }
    }

    /// The WAV bytes, built on first use and kept: async playback reads them
    /// after `play` returns.
    fn wav(self) -> &'static [u8] {
        static ALERT: OnceLock<Vec<u8>> = OnceLock::new();
        static BREAK: OnceLock<Vec<u8>> = OnceLock::new();
        let (notes, gain) = self.notes();
        match self {
            Self::Alert => ALERT.get_or_init(|| wav(notes, gain)),
            Self::Break => BREAK.get_or_init(|| wav(notes, gain)),
        }
    }
}

/// 16-bit mono PCM WAV of the notes, one after the other, overlapping.
fn wav(notes: [f32; 2], gain: f32) -> Vec<u8> {
    let length_s = STEP_S * (notes.len() - 1) as f32 + DECAY_S + 0.05;
    let count = (length_s * RATE as f32) as usize;
    let mut out = Vec::with_capacity(44 + count * 2);
    let data_len = (count * 2) as u32;
    out.extend_from_slice(b"RIFF");
    out.extend_from_slice(&(36 + data_len).to_le_bytes());
    out.extend_from_slice(b"WAVEfmt ");
    out.extend_from_slice(&16u32.to_le_bytes()); // fmt chunk size
    out.extend_from_slice(&1u16.to_le_bytes()); // PCM
    out.extend_from_slice(&1u16.to_le_bytes()); // mono
    out.extend_from_slice(&RATE.to_le_bytes());
    out.extend_from_slice(&(RATE * 2).to_le_bytes()); // bytes per second
    out.extend_from_slice(&2u16.to_le_bytes()); // block align
    out.extend_from_slice(&16u16.to_le_bytes()); // bits per sample
    out.extend_from_slice(b"data");
    out.extend_from_slice(&data_len.to_le_bytes());
    for i in 0..count {
        let t = i as f32 / RATE as f32;
        let mut v = 0.0;
        for (n, freq) in notes.iter().enumerate() {
            let local = t - n as f32 * STEP_S;
            if !(0.0..DECAY_S).contains(&local) {
                continue;
            }
            let envelope = if local < ATTACK_S {
                local / ATTACK_S
            } else {
                // Exponential fall from 1 to about 0.0001 at DECAY_S.
                (-9.2 * (local - ATTACK_S) / (DECAY_S - ATTACK_S)).exp()
            };
            let phase = std::f32::consts::TAU * freq * local;
            v += gain * envelope * (phase.sin() + OVERTONE * (2.0 * phase).sin()) / (1.0 + OVERTONE);
        }
        let sample = (v.clamp(-1.0, 1.0) * i16::MAX as f32) as i16;
        out.extend_from_slice(&sample.to_le_bytes());
    }
    out
}

/// Play the chime without waiting for it. Silent if there is no audio device.
#[cfg(windows)]
pub fn play(chime: Chime) {
    use windows_sys::Win32::Media::Audio::{PlaySoundW, SND_ASYNC, SND_MEMORY, SND_NODEFAULT};
    let bytes = chime.wav();
    // SAFETY: the bytes are a complete WAV that lives for the whole program,
    // so async playback can keep reading them.
    unsafe {
        PlaySoundW(bytes.as_ptr() as _, std::ptr::null_mut(), SND_MEMORY | SND_ASYNC | SND_NODEFAULT);
    }
}

// shortcut: no sound on other OSes yet; add a player when Serion ships there.
#[cfg(not(windows))]
pub fn play(chime: Chime) {
    let _ = chime.wav();
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn wav_header_matches_data() {
        let bytes = Chime::Alert.wav();
        assert_eq!(&bytes[0..4], b"RIFF");
        assert_eq!(&bytes[8..16], b"WAVEfmt ");
        let data_len = u32::from_le_bytes(bytes[40..44].try_into().unwrap()) as usize;
        assert_eq!(bytes.len(), 44 + data_len);
        let riff_len = u32::from_le_bytes(bytes[4..8].try_into().unwrap()) as usize;
        assert_eq!(riff_len, bytes.len() - 8);
    }

    #[test]
    fn chime_is_audible_and_never_clips() {
        let bytes = Chime::Alert.wav();
        let peak = bytes[44..].chunks(2).map(|c| i16::from_le_bytes([c[0], c[1]]).unsigned_abs()).max().unwrap();
        assert!(peak > 4_000 && peak < i16::MAX as u16, "peak {peak}");
    }

    #[test]
    fn unknown_kind_is_rejected() {
        assert!(Chime::parse("alert").is_some());
        assert!(Chime::parse("loud").is_none());
    }
}
