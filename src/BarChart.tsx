import { useLayoutEffect, useRef, useState } from "react";
import { formatHM } from "./types";

export type Bar = {
  key: string;
  /** Short axis label, for example "Mon" or "Oct 6". */
  label: string;
  /** Tooltip heading, for example "Monday, Oct 26". */
  title: string;
  ms: number;
};

const HEIGHT = 190;
const PAD_TOP = 10;
const PAD_BOTTOM = 24;
const PAD_LEFT = 34;
const GAP = 2;
const MAX_BAR = 28;
const RADIUS = 4;
const HOUR = 3_600_000;
/** Axis tops in hours: the smallest one above the tallest bar is used. */
const NICE_HOURS = [1, 2, 3, 4, 6, 8, 10, 12, 16, 20, 24];

/** Bar with rounded top corners and a flat base on the baseline. */
function barPath(x: number, y: number, w: number, h: number) {
  const r = Math.min(RADIUS, w / 2, h);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

/** Single-series bar chart: one theme-colored bar per period, hover for values. */
export function BarChart({ bars, caption }: { bars: Bar[]; caption: string }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(600);
  const [hovered, setHovered] = useState<number | null>(null);

  // Measure the real width so bars keep exact pixel sizes (no stretched SVG).
  useLayoutEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const maxMs = Math.max(...bars.map((b) => b.ms), 1);
  const topHours = NICE_HOURS.find((h) => h * HOUR >= maxMs) ?? Math.ceil(maxMs / HOUR);
  const topMs = topHours * HOUR;
  const plotW = Math.max(width - PAD_LEFT, 1);
  const plotH = HEIGHT - PAD_TOP - PAD_BOTTOM;
  const slot = plotW / bars.length;
  const barW = Math.max(Math.min(slot - GAP, MAX_BAR), 1);
  const y = (ms: number) => PAD_TOP + plotH - (ms / topMs) * plotH;
  const labelEvery = Math.ceil(bars.length / 7);
  const hoveredBar = hovered === null ? null : bars[hovered];

  return (
    <div className="chart" ref={wrap}>
      <svg width={width} height={HEIGHT} role="img" aria-label={caption}>
        {[0, 0.5, 1].map((f) => (
          <g key={f} className="chart-grid">
            <line x1={PAD_LEFT} x2={width} y1={y(topMs * f)} y2={y(topMs * f)} />
            <text x={PAD_LEFT - 8} y={y(topMs * f)} dy="0.32em" textAnchor="end">
              {`${+(topHours * f).toFixed(1)}h`}
            </text>
          </g>
        ))}
        {bars.map((bar, i) => {
          const x = PAD_LEFT + i * slot + (slot - barW) / 2;
          const h = (bar.ms / topMs) * plotH;
          return (
            <g key={bar.key}>
              {h > 0 && (
                <path
                  className={hovered !== null && hovered !== i ? "chart-bar dim" : "chart-bar"}
                  style={{ animationDelay: `${Math.min(i * 12, 400)}ms` }}
                  d={barPath(x, y(bar.ms), barW, h)}
                />
              )}
              {i % labelEvery === 0 && (
                <text className="chart-label" x={x + barW / 2} y={HEIGHT - 6} textAnchor="middle">
                  {bar.label}
                </text>
              )}
              {/* Hit area: the whole column, wider and taller than the bar. */}
              <rect
                className="chart-hit"
                x={PAD_LEFT + i * slot}
                y={PAD_TOP}
                width={slot}
                height={plotH}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
              />
            </g>
          );
        })}
      </svg>
      {hoveredBar && hovered !== null && (
        <div
          className="chart-tip"
          style={{
            left: Math.min(Math.max(PAD_LEFT + hovered * slot + slot / 2, 70), width - 70),
            top: Math.max(y(hoveredBar.ms) - 8, 0),
          }}
        >
          <span>{hoveredBar.title}</span>
          <strong>{formatHM(hoveredBar.ms)}</strong>
        </div>
      )}
      {/* The same numbers as a table, for screen readers. */}
      <table className="sr-only">
        <caption>{caption}</caption>
        <tbody>
          {bars.map((bar) => (
            <tr key={bar.key}>
              <th scope="row">{bar.title}</th>
              <td>{formatHM(bar.ms)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
