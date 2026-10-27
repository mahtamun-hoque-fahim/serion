//! What is on screen right now: the focused window, every open app window
//! (top of the stack first), monitors, and whether something keeps the
//! display awake. Read from the OS once a second; the rules about what
//! counts live in tracker.rs.

use std::collections::HashMap;
use std::path::PathBuf;

use crate::tracker::Window;

pub struct Snapshot {
    /// The focused window; None on the lock screen, a UAC prompt, or mid-switch.
    pub foreground: Option<Window>,
    /// Visible, non-minimized top-level windows, topmost first. Unfiltered:
    /// tracker::open_apps keeps only the real apps.
    pub windows: Vec<Window>,
    pub monitors: usize,
    /// An app asked Windows to keep the display on (video, call, game).
    pub awake: bool,
}

/// Display names by exe path; resolving reads files, too slow to repeat each second.
pub type NameCache = HashMap<PathBuf, String>;

#[cfg(windows)]
pub use win::snapshot;

#[cfg(not(windows))]
pub fn snapshot(_names: &mut NameCache) -> Snapshot {
    // shortcut: Windows only for now; add the macOS and Linux scans with those builds.
    Snapshot { foreground: None, windows: Vec::new(), monitors: 1, awake: false }
}

#[cfg(windows)]
mod win {
    use std::path::PathBuf;

    use windows_sys::Win32::Foundation::{CloseHandle, BOOL, HWND, LPARAM, RECT};
    use windows_sys::Win32::Graphics::Dwm::{DwmGetWindowAttribute, DWMWA_CLOAKED};
    use windows_sys::Win32::Graphics::Gdi::{GetMonitorInfoW, MonitorFromWindow, MONITORINFO, MONITOR_DEFAULTTONEAREST};
    use windows_sys::Win32::System::Power::{CallNtPowerInformation, SystemExecutionState};
    use windows_sys::Win32::System::Threading::{
        OpenProcess, QueryFullProcessImageNameW, PROCESS_NAME_WIN32, PROCESS_QUERY_LIMITED_INFORMATION,
    };
    use windows_sys::Win32::UI::WindowsAndMessaging::{
        EnumWindows, GetForegroundWindow, GetSystemMetrics, GetWindow, GetWindowLongW, GetWindowRect, GetWindowTextW,
        GetWindowThreadProcessId, IsIconic, IsWindowVisible, GWL_EXSTYLE, GW_OWNER, SM_CMONITORS, WS_EX_TOOLWINDOW,
    };

    use super::{NameCache, Snapshot};
    use crate::tracker::Window;

    /// ES_DISPLAY_REQUIRED: someone keeps the screen on.
    const DISPLAY_REQUIRED: u32 = 0x2;

    pub fn snapshot(names: &mut NameCache) -> Snapshot {
        let own_pid = std::process::id();
        let fg = unsafe { GetForegroundWindow() };
        let foreground = (!fg.is_null()).then(|| describe(fg, own_pid, names)).flatten();

        let mut handles: Vec<HWND> = Vec::new();
        unsafe { EnumWindows(Some(collect), &mut handles as *mut Vec<HWND> as LPARAM) };
        let windows = handles
            .into_iter()
            .filter(|&h| is_alt_tab_window(h))
            .filter_map(|h| describe(h, own_pid, names))
            .collect();

        let monitors = unsafe { GetSystemMetrics(SM_CMONITORS) }.max(1) as usize;
        let mut state = 0u32;
        let ok = unsafe {
            CallNtPowerInformation(SystemExecutionState, std::ptr::null(), 0, (&mut state as *mut u32).cast(), 4)
        };
        Snapshot { foreground, windows, monitors, awake: ok == 0 && state & DISPLAY_REQUIRED != 0 }
    }

    unsafe extern "system" fn collect(hwnd: HWND, lparam: LPARAM) -> BOOL {
        // SAFETY: lparam is the &mut Vec passed to EnumWindows just above.
        unsafe { (*(lparam as *mut Vec<HWND>)).push(hwnd) };
        1
    }

    /// The windows Alt+Tab would show: visible, not minimized, not hidden by
    /// Windows (cloaked: other desktops, suspended Store apps), no owner, not a
    /// tool window, and with a title.
    fn is_alt_tab_window(hwnd: HWND) -> bool {
        unsafe {
            if IsWindowVisible(hwnd) == 0 || IsIconic(hwnd) != 0 || !GetWindow(hwnd, GW_OWNER).is_null() {
                return false;
            }
            if GetWindowLongW(hwnd, GWL_EXSTYLE) as u32 & WS_EX_TOOLWINDOW != 0 {
                return false;
            }
            let mut cloaked = 0u32;
            let hr = DwmGetWindowAttribute(hwnd, DWMWA_CLOAKED as u32, (&mut cloaked as *mut u32).cast(), 4);
            hr != 0 || cloaked == 0
        }
    }

    fn describe(hwnd: HWND, own_pid: u32, names: &mut NameCache) -> Option<Window> {
        let mut pid = 0u32;
        unsafe { GetWindowThreadProcessId(hwnd, &mut pid) };
        let title = window_title(hwnd);
        let path = process_path(pid);
        let mut exe = path
            .as_ref()
            .and_then(|p| p.file_name())
            .map(|n| n.to_string_lossy().to_lowercase())
            .unwrap_or_default();

        let mut rect = RECT { left: 0, top: 0, right: 0, bottom: 0 };
        unsafe { GetWindowRect(hwnd, &mut rect) };
        let (width, height) = (f64::from(rect.right - rect.left), f64::from(rect.bottom - rect.top));
        let (monitor, fullscreen) = monitor_of(hwnd, &rect);

        // Built-in apps (Settings, Calculator, Photos) draw their windows
        // through this shared host, so the exe says nothing; the title is the app.
        let name = if exe == "applicationframehost.exe" && !title.trim().is_empty() {
            exe = format!("uwp:{}", title.trim().to_lowercase());
            title.trim().to_string()
        } else {
            match &path {
                Some(p) => names
                    .entry(p.clone())
                    .or_insert_with(|| crate::names::resolve(p, pid).unwrap_or_else(|| exe.clone()))
                    .clone(),
                None => exe.clone(),
            }
        };

        // Serion's own dashboard counts like any app; the pill and the flash do not.
        let dashboard = pid == own_pid && title == "Serion";
        let is_self = pid == own_pid && !dashboard;
        let (exe, name) = if dashboard { ("serion.exe".into(), "Serion".into()) } else { (exe, name) };
        Some(Window {
            exe,
            name,
            title,
            width,
            height,
            minimized: unsafe { IsIconic(hwnd) != 0 },
            is_self,
            fullscreen,
            monitor,
        })
    }

    /// The monitor a window is on, and whether it covers that monitor exactly.
    fn monitor_of(hwnd: HWND, rect: &RECT) -> (isize, bool) {
        unsafe {
            let monitor = MonitorFromWindow(hwnd, MONITOR_DEFAULTTONEAREST);
            let mut info: MONITORINFO = std::mem::zeroed();
            info.cbSize = std::mem::size_of::<MONITORINFO>() as u32;
            if GetMonitorInfoW(monitor, &mut info) == 0 {
                return (monitor as isize, false);
            }
            let m = info.rcMonitor;
            // Maximized windows overhang the screen by their borders, so only
            // true fullscreen (video, game, F11) matches the monitor exactly.
            let full = rect.left == m.left && rect.top == m.top && rect.right == m.right && rect.bottom == m.bottom;
            (monitor as isize, full)
        }
    }

    fn window_title(hwnd: HWND) -> String {
        let mut buf = [0u16; 512];
        let len = unsafe { GetWindowTextW(hwnd, buf.as_mut_ptr(), buf.len() as i32) };
        String::from_utf16_lossy(&buf[..len.max(0) as usize])
    }

    fn process_path(pid: u32) -> Option<PathBuf> {
        unsafe {
            let process = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, 0, pid);
            if process.is_null() {
                return None;
            }
            let mut buf = [0u16; 1024];
            let mut len = buf.len() as u32;
            let ok = QueryFullProcessImageNameW(process, PROCESS_NAME_WIN32, buf.as_mut_ptr(), &mut len) != 0;
            CloseHandle(process);
            ok.then(|| PathBuf::from(String::from_utf16_lossy(&buf[..len as usize])))
        }
    }
}
