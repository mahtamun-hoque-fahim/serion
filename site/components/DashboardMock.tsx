import { Minus, Monitor, Moon, Sun, X } from "lucide-react";
import { SerionMark } from "./SerionMark";

/* The figures from the real capture this replaces, so the page tells the same story. */
const week = [
  { day: "Thu", hours: 1.2 },
  { day: "Fri", hours: 5.8 },
  { day: "Sat", hours: 4.8 },
  { day: "Sun", hours: 2.1 },
  { day: "Mon", hours: 3.5 },
  { day: "Tue", hours: 3.4 },
  { day: "Wed", hours: 3.1 },
];

const apps = [
  { name: "Firefox", time: "12h 48m", pct: 53 },
  { name: "OpenCode", time: "5h 26m", pct: 23 },
  { name: "Microsoft Office 15", time: "2h 18m", pct: 10 },
  { name: "WhatsApp", time: "1h 23m", pct: 6 },
  { name: "Serion", time: "42m", pct: 3 },
  { name: "Windows Explorer", time: "22m", pct: 2 },
  { name: "Brave Browser", time: "15m", pct: 1 },
  { name: "FreeLLMAPI menu-bar app", time: "12m", pct: 1 },
];

const breaks = [
  { name: "Water break", note: "Drink a glass of water.", every: 45, length: 1, unit: "min" },
  { name: "Stretch break", note: "Stand up and move.", every: 75, length: 3, unit: "min" },
  { name: "Rest your eyes", note: "Look at something far away.", every: 20, length: 30, unit: "sec" },
];

const MAX_HOURS = 6;

/**
 * The dashboard drawn in the page instead of a screenshot, so its bars can
 * grow in when the card is revealed (the card's `is-in` class from ScrollFx).
 * Sizes are in cqw of the card, so it scales like the image did.
 */
export function DashboardMock() {
  return (
    <div className="dm" role="img" aria-label="The Serion dashboard in dark mode: today's total, the daily average, a week of bars and the top apps">
      <div className="dm-titlebar">
        <span className="dm-brand">
          <span className="dm-mark">
            <SerionMark />
          </span>
          Serion
        </span>
        <span className="dm-tabs">
          {["7D", "30D", "90D", "1Y", "5Y"].map((tab, i) => (
            <span key={tab} className={i === 0 ? "is-on" : undefined}>
              {tab}
            </span>
          ))}
        </span>
        <span className="dm-window">
          <span className="dm-modes">
            <Monitor />
            <Sun />
            <Moon />
          </span>
          <Minus />
          <X />
        </span>
      </div>

      <div className="dm-tiles">
        <div className="dm-card">
          <p className="dm-label">Today</p>
          <p className="dm-value">3h 7m</p>
        </div>
        <div className="dm-card">
          <p className="dm-label">Daily average</p>
          <p className="dm-value">3h 26m</p>
          <p className="dm-note">7 active days</p>
        </div>
        <div className="dm-card">
          <p className="dm-label">Most used</p>
          <p className="dm-value">Firefox</p>
          <p className="dm-note">12h 48m</p>
        </div>
      </div>

      <div className="dm-card dm-chart">
        <p className="dm-h">Screen time per day</p>
        <div className="dm-plot">
          {["6h", "3h", "0h"].map((tick) => (
            <span key={tick} className="dm-tick">
              {tick}
            </span>
          ))}
          <div className="dm-bars">
            {week.map((d, i) => (
              <div key={d.day} className="dm-col">
                <i
                  className="dm-bar"
                  style={{ height: `${(d.hours / MAX_HOURS) * 100}%`, transitionDelay: `${0.3 + i * 0.07}s` }}
                />
                <span>{d.day}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="dm-columns">
        <div className="dm-stack">
          <div className="dm-card">
            <p className="dm-h">Top apps</p>
            <ul className="dm-apps">
              {apps.map((app, i) => (
                <li key={app.name}>
                  <span className="dm-app-name">{app.name}</span>
                  <span className="dm-app-time">
                    {app.time} <small>{app.pct}%</small>
                  </span>
                  <i className="dm-track">
                    <b
                      style={{ width: `${(app.pct / apps[0].pct) * 100}%`, transitionDelay: `${0.6 + i * 0.06}s` }}
                    />
                  </i>
                </li>
              ))}
            </ul>
          </div>

          <div className="dm-card">
            <p className="dm-h">Pill</p>
            <p className="dm-sub">Display</p>
            <span className="dm-seg">
              <span>Hidden</span>
              <span>Icon</span>
              <span className="is-on">Full</span>
            </span>
            <p className="dm-note">The icon and today&rsquo;s time.</p>
            <p className="dm-sub">Size</p>
            <span className="dm-seg">
              <span>Small</span>
              <span className="is-on">Large</span>
            </span>
          </div>
        </div>

        <div className="dm-stack">
          <div className="dm-card">
            <p className="dm-h">Timers</p>
            <p className="dm-sub">Daily limit</p>
            <div className="dm-row">
              <span className="dm-field">2</span>h<span className="dm-field">0</span>m
              <span className="dm-btn">Set limit</span>
            </div>
            <hr />
            <p className="dm-sub">Countdown</p>
            <div className="dm-row">
              {["15m", "25m", "45m", "60m"].map((c) => (
                <span key={c} className="dm-chip">
                  {c}
                </span>
              ))}
              <span className="dm-field">30</span>m<span className="dm-btn">Start</span>
            </div>
          </div>

          <div className="dm-card">
            <p className="dm-h">Breaks</p>
            <p className="dm-note">
              Each break is offered after its amount of screen time. Start it from the pill;
              screen time pauses while it runs.
            </p>
            {breaks.map((b) => (
              <div key={b.name} className="dm-break">
                <div className="dm-break-head">
                  <span>
                    <b>{b.name}</b>
                    <small>{b.note}</small>
                  </span>
                  <i className="dm-switch" />
                </div>
                <div className="dm-row">
                  Every <span className="dm-field">{b.every}</span> min of screen time, for
                  <span className="dm-field">{b.length}</span>
                  <span className="dm-field dm-select">{b.unit}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
