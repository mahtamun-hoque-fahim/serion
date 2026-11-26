import {
  BookOpen,
  Calendar,
  ChartColumn,
  Droplet,
  Palette,
  Timer,
} from "lucide-react";

const cards = [
  {
    icon: ChartColumn,
    title: "Today, per app",
    body: "Click the pill to see which apps took the hours.",
  },
  {
    icon: Calendar,
    title: "A week, or a month",
    body: "Seven and thirty days of history, with your daily average and your most-used app.",
  },
  {
    icon: Timer,
    title: "Timers that end the day on purpose",
    body: "Set a daily limit or a countdown. When it runs out, the pill flashes red and a soft chime plays.",
  },
  {
    icon: Droplet,
    title: "Breaks you can ignore",
    body: "Water, a stretch, a look out the window. Serion offers them from the pill; skipping is one click.",
  },
  {
    icon: BookOpen,
    title: "Reading mode",
    body: "On a long page, it waits twenty minutes before it calls you idle.",
  },
  {
    icon: Palette,
    title: "Yours to shape",
    body: "Six colors, a light or dark dashboard, a small or large pill, and you can drag it wherever you like.",
  },
];

export function Features() {
  return (
    <section className="features" id="features">
      <div className="container">
        <div className="section-head">
          <h2>Small tool. Whole day.</h2>
        </div>
        <div className="feature-grid">
          {cards.map(({ icon: Icon, title, body }) => (
            <article className="feature-card" key={title}>
              <span className="icon-tile">
                <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
              </span>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
