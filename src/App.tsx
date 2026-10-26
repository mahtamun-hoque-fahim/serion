import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { Hand, Moon } from "lucide-react";
import "@fontsource/google-sans/latin-700.css";
import "./App.css";

/** Matches the `Tick` struct the Rust loop emits every second. */
type Tick = {
  text: string;
  state: "active" | "idle" | "hold";
};

const STATE_LABEL: Record<Tick["state"], string> = {
  active: "Counting",
  idle: "Paused: idle",
  hold: "On hold: no app in front",
};

/**
 * Paused states swap the logo for an icon. The moon is filled (fill set to the
 * stroke color); the hand stays an outline because filling closes the gaps
 * between its fingers and it turns into a blob.
 */
const STATE_ICON = {
  idle: { Icon: Moon, fill: "currentColor" },
  hold: { Icon: Hand, fill: "none" },
};

export default function App() {
  const [tick, setTick] = useState<Tick>({ text: "0m", state: "hold" });

  useEffect(() => {
    const unlisten = listen<Tick>("tick", (event) => setTick(event.payload));
    return () => {
      unlisten.then((stop) => stop());
    };
  }, []);

  const icon = tick.state === "active" ? null : STATE_ICON[tick.state];

  return (
    <div
      className="pill"
      data-tauri-drag-region
      title={`${STATE_LABEL[tick.state]}. Right-click to quit.`}
      onContextMenu={(event) => {
        event.preventDefault();
        invoke("quit");
      }}
    >
      {/* Placeholder logo; its look doubles as the state indicator. */}
      <div className="logo" data-tauri-drag-region aria-label={STATE_LABEL[tick.state]}>
        {icon ? (
          <icon.Icon className="state-icon" size={20} fill={icon.fill} aria-hidden data-tauri-drag-region />
        ) : (
          "logo"
        )}
      </div>
      <span className="time" data-tauri-drag-region>
        {tick.text}
      </span>
    </div>
  );
}
