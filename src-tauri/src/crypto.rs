//! Encryption for everything Serion writes: day files, settings, exports.
//!
//! AES-256-GCM with a key built into Serion. Opening a file shows nothing
//! readable, and GCM refuses to decrypt if a single byte was changed, so
//! tampering is caught without a separate signature. Exports therefore open
//! on any Serion install.
//!
//! Honest limit: the key ships inside the app, so someone who takes the app
//! apart could recover it. This keeps your data private from anyone opening
//! the files; it is not protection against a determined attacker. The key is
//! never in the source code, so publishing the repo does not reveal it.

use aes_gcm::aead::{Aead, AeadCore, KeyInit, OsRng};
use aes_gcm::{Aes256Gcm, Key, Nonce};

/// File marker and format version, so Serion files are recognised (and old
/// plain JSON files can be told apart and migrated).
const MAGIC: &[u8; 4] = b"SRN1";
const NONCE_LEN: usize = 12;

/// Embedded at build time from src-tauri/serion.key, which is kept out of the
/// repo (.gitignore); build.rs checks it exists and is 32 bytes.
const KEY: &[u8; 32] = include_bytes!("../serion.key");

fn cipher() -> Aes256Gcm {
    Aes256Gcm::new(Key::<Aes256Gcm>::from_slice(KEY))
}

/// MAGIC + a fresh random nonce + the encrypted, authenticated bytes.
pub fn seal(plain: &[u8]) -> Vec<u8> {
    let nonce = Aes256Gcm::generate_nonce(&mut OsRng);
    let body = cipher().encrypt(&nonce, plain).expect("AES-GCM encryption cannot fail for in-memory data");
    [MAGIC.as_slice(), nonce.as_slice(), &body].concat()
}

/// The plain bytes back, or None if this is not a Serion file or it was changed.
pub fn open(sealed: &[u8]) -> Option<Vec<u8>> {
    let rest = sealed.strip_prefix(MAGIC.as_slice())?;
    if rest.len() < NONCE_LEN {
        return None;
    }
    let (nonce, body) = rest.split_at(NONCE_LEN);
    cipher().decrypt(Nonce::from_slice(nonce), body).ok()
}

/// Starts like a Serion file (used to tell old plain JSON apart).
pub fn is_sealed(bytes: &[u8]) -> bool {
    bytes.starts_with(MAGIC)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn round_trips_and_hides_the_content() {
        let plain = br#"{"day":"2026-10-27","total_ms":4463303}"#;
        let sealed = seal(plain);
        assert!(is_sealed(&sealed));
        assert!(!sealed.windows(9).any(|w| w == b"total_ms\""), "plain text must not show");
        assert_eq!(open(&sealed).as_deref(), Some(plain.as_slice()));
    }

    #[test]
    fn same_data_seals_differently_each_time() {
        assert_ne!(seal(b"same"), seal(b"same"));
    }

    #[test]
    fn any_changed_byte_is_refused() {
        let mut sealed = seal(b"{\"total_ms\":1000}");
        let last = sealed.len() - 1;
        sealed[last] ^= 1;
        assert_eq!(open(&sealed), None);
        assert_eq!(open(b"{\"not\":\"serion\"}"), None);
        assert_eq!(open(b"SRN1short"), None);
    }
}
