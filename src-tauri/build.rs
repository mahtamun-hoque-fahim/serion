fn main() {
    // The encryption key (see src/crypto.rs) lives outside the repo, in
    // serion.key next to this file: exactly 32 bytes, ignored by git.
    // Without it the build stops here instead of using a known key.
    println!("cargo:rerun-if-changed=serion.key");
    match std::fs::metadata("serion.key") {
        Ok(meta) if meta.len() == 32 => {}
        Ok(meta) => panic!("src-tauri/serion.key must be exactly 32 bytes, found {}", meta.len()),
        Err(_) => panic!(
            "src-tauri/serion.key is missing. Create one with 32 random bytes, for example in PowerShell:\n  \
             $b = New-Object byte[] 32; [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b); \
             [IO.File]::WriteAllBytes('serion.key', $b)\n\
             Keep it safe: data written with one key cannot be read with another."
        ),
    }
    tauri_build::build()
}
