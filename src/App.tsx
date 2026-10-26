import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { Eye, Hand, Moon } from "lucide-react";
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
 * Each state shows its own icon in the circle. The moon is filled (fill set to
 * the stroke color); the eye and hand stay outlines because filling them hides
 * the pupil and closes the gaps between the fingers.
 */
const STATE_ICON = {
  active: { Icon: Eye, fill: "none" },
  idle: { Icon: Moon, fill: "currentColor" },
  hold: { Icon: Hand, fill: "none" },
};

/** Draws its lines in when mounted; remount it to replay. */
function StateIcon({ state }: { state: Tick["state"] }) {
  const ref = useRef<SVGSVGElement>(null);
  const { Icon, fill } = STATE_ICON[state];

  // Give every line a length of 1 so the CSS draw animation runs all of them
  // at the same pace, whatever their real length. Runs before the first paint.
  useLayoutEffect(() => {
    ref.current
      ?.querySelectorAll("path, circle, line, rect, polyline, ellipse")
      .forEach((shape) => shape.setAttribute("pathLength", "1"));
  }, []);

  return (
    <Icon ref={ref} className="state-icon" size={20} fill={fill} aria-hidden data-tauri-drag-region />
  );
}

export default function App() {
  const [tick, setTick] = useState<Tick>({ text: "0m", state: "hold" });

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
      {/* key = state: a state change mounts a fresh circle and icon, which
          replays the pop and then the draw. */}
      <div key={tick.state} className="logo" data-tauri-drag-region aria-label={STATE_LABEL[tick.state]}>
        <StateIcon state={tick.state} />
      </div>
      <span className="time" data-tauri-drag-region>
        {tick.text}
      </span>
    </div>
  );
}
