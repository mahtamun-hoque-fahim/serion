import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";

/** Matches the `Tick` struct the Rust loop emits every second. */
type Tick = {
  text: string;
  state: "active" | "idle" | "away";
};

const STATE_LABEL: Record<Tick["state"], string> = {
  active: "Counting",
  idle: "Paused: idle",
  away: "Paused: no app in front",
};

export default function App() {
  const [tick, setTick] = useState<Tick>({ text: "0m", state: "away" });

  useEffect(() => {
    const unlisten = listen<Tick>("tick", (event) => setTick(event.payload));
    return () => {
      unlisten.then((stop) => stop());
    };
  }, []);

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
      <div className={`logo ${tick.state}`} data-tauri-drag-region aria-label={STATE_LABEL[tick.state]}>
        logo
      </div>
      <span className="time" data-tauri-drag-region>
        {tick.text}
      </span>
    </div>
  );
}
