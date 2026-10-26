//! Human app names ("WhatsApp", "Snipping Tool") instead of process names
//! ("WhatsApp.Root", "ScreenClippingHost").
//!
//! Order, first hit wins:
//! 1. Store and system apps: the DisplayName in the package's AppxManifest.xml.
//!    An "ms-resource:" name is looked up by Windows, in the user's language.
//! 2. Classic programs: the FileDescription in the exe's version info.
//! 3. None: the caller falls back to what active-win reported.

use std::path::Path;

/// Resolve the display name of the app whose exe is at `exe`, running as `pid`.
pub fn resolve(exe: &Path, pid: u32) -> Option<String> {
    from_manifest(exe, pid).or_else(|| platform::file_description(exe))
}

fn from_manifest(exe: &Path, pid: u32) -> Option<String> {
    let exe_file = exe.file_name()?.to_str()?;
    // The manifest sits in the package root: the exe's folder or a few above it.
    let root = exe.ancestors().skip(1).take(4).find(|dir| dir.join("AppxManifest.xml").is_file())?;
    let xml = std::fs::read_to_string(root.join("AppxManifest.xml")).ok()?;
    let name = manifest_display_name(&xml, exe_file)?;
    match name.strip_prefix("ms-resource:") {
        None => Some(name),
        Some(key) => {
            let package = platform::package_full_name(pid)?;
            let uri = resource_uri(&attr(tag_at(&xml, "<Identity")?, "Name")?, key);
            platform::load_indirect(&format!("@{{{package}?{uri}}}"))
        }
    }
}

/// The DisplayName of the <Application> whose Executable is `exe_file`,
/// or the package's own DisplayName when no application matches.
fn manifest_display_name(xml: &str, exe_file: &str) -> Option<String> {
    let mut rest = xml;
    while let Some(start) = rest.find("<Application ") {
        let element = &rest[start..];
        let end = element.find("</Application>").unwrap_or(element.len());
        let element = &element[..end];
        let opening = &element[..element.find('>').unwrap_or(element.len())];
        let matches = attr(opening, "Executable")
            .and_then(|e| e.rsplit(['\\', '/']).next().map(|f| f.eq_ignore_ascii_case(exe_file)))
            .unwrap_or(false);
        if matches {
            if let Some(name) = attr(element, "DisplayName") {
                return Some(name);
            }
        }
        rest = &rest[start + end.max(1)..];
    }
    let properties = &xml[xml.find("<Properties>")?..];
    let open = properties.find("<DisplayName>")? + "<DisplayName>".len();
    let close = properties[open..].find("</DisplayName>")?;
    Some(unescape(properties[open..open + close].trim()))
}

/// Full resource URI for a manifest "ms-resource:" value.
fn resource_uri(package_name: &str, key: &str) -> String {
    if key.starts_with("//") {
        format!("ms-resource:{key}")
    } else if key.starts_with('/') {
        format!("ms-resource://{package_name}{key}")
    } else {
        format!("ms-resource://{package_name}/resources/{key}")
    }
}

/// The text of the first tag that starts with `open`, up to its '>'.
fn tag_at<'a>(xml: &'a str, open: &str) -> Option<&'a str> {
    let start = xml.find(open)?;
    let end = xml[start..].find('>')?;
    Some(&xml[start..start + end])
}

/// Value of attribute `name` (exact, whole name) in `text`.
fn attr(text: &str, name: &str) -> Option<String> {
    let needle = format!("{name}=\"");
    let mut from = 0;
    while let Some(i) = text[from..].find(&needle) {
        let at = from + i;
        let whole_name = at == 0 || text[..at].ends_with(|c: char| c.is_whitespace());
        let value_start = at + needle.len();
        if whole_name {
            let len = text[value_start..].find('"')?;
            return Some(unescape(&text[value_start..value_start + len]));
        }
        from = value_start;
    }
    None
}

fn unescape(s: &str) -> String {
    s.replace("&quot;", "\"").replace("&apos;", "'").replace("&lt;", "<").replace("&gt;", ">").replace("&amp;", "&")
}

#[cfg(windows)]
mod platform {
    use std::ffi::c_void;
    use std::path::Path;
    use std::ptr::{null, null_mut};

    use windows_sys::Win32::Foundation::CloseHandle;
    use windows_sys::Win32::Storage::FileSystem::{GetFileVersionInfoSizeW, GetFileVersionInfoW, VerQueryValueW};
    use windows_sys::Win32::Storage::Packaging::Appx::GetPackageFullName;
    use windows_sys::Win32::System::Threading::{OpenProcess, PROCESS_QUERY_LIMITED_INFORMATION};
    use windows_sys::Win32::UI::Shell::SHLoadIndirectString;

    fn wide(s: &str) -> Vec<u16> {
        s.encode_utf16().chain(Some(0)).collect()
    }

    fn from_wide(buf: &[u16]) -> String {
        let end = buf.iter().position(|&c| c == 0).unwrap_or(buf.len());
        String::from_utf16_lossy(&buf[..end]).trim().to_string()
    }

    pub fn package_full_name(pid: u32) -> Option<String> {
        unsafe {
            let process = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, 0, pid);
            if process.is_null() {
                return None;
            }
            // First call asks for the length, second fills the buffer.
            let mut len = 0u32;
            GetPackageFullName(process, &mut len, null_mut());
            let mut buf = vec![0u16; len as usize];
            let ok = len > 0 && GetPackageFullName(process, &mut len, buf.as_mut_ptr()) == 0;
            CloseHandle(process);
            ok.then(|| from_wide(&buf)).filter(|s| !s.is_empty())
        }
    }

    /// Resolve "@{Package?ms-resource://...}" to text, in the user's language.
    pub fn load_indirect(source: &str) -> Option<String> {
        let source = wide(source);
        let mut buf = vec![0u16; 512];
        let hr = unsafe { SHLoadIndirectString(source.as_ptr(), buf.as_mut_ptr(), buf.len() as u32, null()) };
        (hr >= 0).then(|| from_wide(&buf)).filter(|s| !s.is_empty())
    }

    pub fn file_description(exe: &Path) -> Option<String> {
        let path = wide(exe.to_str()?);
        unsafe {
            let size = GetFileVersionInfoSizeW(path.as_ptr(), null_mut());
            if size == 0 {
                return None;
            }
            let mut data = vec![0u8; size as usize];
            if GetFileVersionInfoW(path.as_ptr(), 0, size, data.as_mut_ptr().cast()) == 0 {
                return None;
            }
            let query = |key: &str| -> Option<(*mut c_void, u32)> {
                let mut value = null_mut();
                let mut len = 0u32;
                let found = VerQueryValueW(data.as_ptr().cast(), wide(key).as_ptr(), &mut value, &mut len);
                (found != 0 && len > 0).then_some((value, len))
            };
            // The file's own language first, then the usual US English tables.
            let mut tables = vec![(0x0409u16, 0x04b0u16), (0x0409, 0x04e4)];
            if let Some((value, len)) = query("\\VarFileInfo\\Translation") {
                if len >= 4 {
                    let pair = value as *const u16;
                    tables.insert(0, (*pair, *pair.add(1)));
                }
            }
            tables.into_iter().find_map(|(lang, codepage)| {
                let (value, len) = query(&format!("\\StringFileInfo\\{lang:04x}{codepage:04x}\\FileDescription"))?;
                let text = from_wide(std::slice::from_raw_parts(value as *const u16, len as usize));
                (!text.is_empty()).then_some(text)
            })
        }
    }
}

#[cfg(not(windows))]
mod platform {
    // shortcut: no Windows manifests or version info elsewhere; macOS could
    // read the bundle's CFBundleDisplayName, add it with the macOS build.
    use std::path::Path;

    pub fn package_full_name(_pid: u32) -> Option<String> {
        None
    }

    pub fn load_indirect(_source: &str) -> Option<String> {
        None
    }

    pub fn file_description(_exe: &Path) -> Option<String> {
        None
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const MANIFEST: &str = r#"<Package>
      <Identity Name="MicrosoftWindows.Client.CBS" Version="1.0" />
      <Properties><DisplayName>ms-resource:ProductPkgDisplayName</DisplayName></Properties>
      <Applications>
        <Application Id="Clip" Executable="ScreenClippingHost.exe">
          <uap:VisualElements DisplayName="ms-resource:ScreenClippingAppName/Text" />
        </Application>
        <Application Id="App" Executable="app\Claude.exe" EntryPoint="Windows.FullTrustApplication">
          <uap:VisualElements DisplayName="Claude &amp; Co" Description="x" />
        </Application>
      </Applications>
    </Package>"#;

    #[test]
    fn picks_the_application_that_owns_the_exe() {
        assert_eq!(manifest_display_name(MANIFEST, "claude.exe").as_deref(), Some("Claude & Co"));
        assert_eq!(
            manifest_display_name(MANIFEST, "ScreenClippingHost.exe").as_deref(),
            Some("ms-resource:ScreenClippingAppName/Text")
        );
    }

    #[test]
    fn falls_back_to_the_package_name() {
        assert_eq!(
            manifest_display_name(MANIFEST, "other.exe").as_deref(),
            Some("ms-resource:ProductPkgDisplayName")
        );
    }

    #[test]
    fn builds_resource_uris() {
        assert_eq!(
            resource_uri("Pkg", "ScreenClippingAppName/Text"),
            "ms-resource://Pkg/resources/ScreenClippingAppName/Text"
        );
        assert_eq!(resource_uri("Pkg", "/Files/Name"), "ms-resource://Pkg/Files/Name");
        assert_eq!(resource_uri("Pkg", "//Other/x"), "ms-resource://Other/x");
    }

    #[test]
    fn attr_matches_whole_names_only() {
        let tag = r#"<uap:VisualElements ShortDisplayName="no" DisplayName="yes">"#;
        assert_eq!(attr(tag, "DisplayName").as_deref(), Some("yes"));
        assert_eq!(attr(tag_at(MANIFEST, "<Identity").unwrap(), "Name").as_deref(), Some("MicrosoftWindows.Client.CBS"));
    }
}
