import { Check } from "lucide-react";
import { DashboardMock } from "./DashboardMock";

const bullets = [
  "Today, your average and your most-used app, at the top.",
  "One bar per day. Hover for the exact number.",
  "Apps ranked by time, not by how often you opened them.",
];

export function Showcase() {
  return (
    <section className="showcase" id="features">
      <div className="container showcase-grid">
        <figure className="dashboard-card" data-reveal>
          <DashboardMock />
        </figure>

        <div className="showcase-copy">
          <h2 data-reveal="1">Where the hours actually went.</h2>
          <p data-reveal="2">
            Seven days at a glance, thirty when you need the bigger picture. A bar for each
            day, your top apps in order, and your average for the week.
          </p>
          <ul className="bullets" data-reveal="3">
            {bullets.map((line) => (
              <li key={line}>
                <Check size={17} strokeWidth={2.4} aria-hidden="true" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
