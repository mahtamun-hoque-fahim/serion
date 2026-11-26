import { Eye } from "lucide-react";
import { SerionMark } from "./SerionMark";

/**
 * A laptop drawn in the page, not photographed: the screen carries the real
 * pill at three widths. `mode` is 0 Hidden, 1 Icon, 2 Full.
 */
export function Laptop({ mode }: { mode: 0 | 1 | 2 }) {
  return (
    <div className="laptop" data-mode={mode} aria-hidden="true">
      <div className="laptop-lid">
        <span className="laptop-camera" />
        <div className="laptop-screen">
          <div className="mini">
            <div className="mini-wall" />

            <div className="mini-window">
              <div className="mini-titlebar">
                <span />
                <span />
                <span />
              </div>
              <div className="mini-lines">
                <i style={{ width: "84%" }} />
                <i style={{ width: "62%" }} />
                <i style={{ width: "72%" }} />
                <i style={{ width: "38%" }} />
              </div>
            </div>

            <div className="mini-pill">
              <span className="mini-pill-icon">
                <Eye size={12} strokeWidth={1.9} />
              </span>
              <span className="mini-pill-time">2.9h</span>
            </div>

            <div className="mini-tip">
              <SerionMark size={9} />
              <span>
                Serion · <b>2.9h today</b>
              </span>
            </div>

            <div className="mini-taskbar">
              <span className="mini-start">
                <span />
                <span />
                <span />
                <span />
              </span>
              <span className="mini-tray">
                <span className="mini-trayicon">
                  <SerionMark size={9} />
                </span>
                <span className="mini-clock">18:42</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="laptop-base">
        <div className="laptop-keyboard" />
        <div className="laptop-trackpad" />
      </div>
    </div>
  );
}
