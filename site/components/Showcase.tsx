import { Check } from "lucide-react";

const bullets = [
  "Today, your average and your most-used app, at the top.",
  "One bar per day. Hover for the exact number.",
  "Apps ranked by time, not by how often you opened them.",
];

export function Showcase() {
  return (
    <section className="showcase">
      <div className="container showcase-grid">
        <figure className="shot-card">
          <img
            src="/dashboard.png"
            alt="The Serion dashboard in dark mode: today's total, the daily average, a week of bars and the top apps"
            width={1840}
            height={2120}
            loading="lazy"
          />
        </figure>

        <div className="showcase-copy">
          <h2>Where the hours actually went.</h2>
          <p className="lede">
            Seven days at a glance, thirty when you need the bigger picture. A bar for each
            day, your top apps in order, and your average for the week.
          </p>
          <ul className="bullets">
            {bullets.map((line) => (
              <li key={line}>
                <Check size={17} strokeWidth={2.2} aria-hidden="true" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
