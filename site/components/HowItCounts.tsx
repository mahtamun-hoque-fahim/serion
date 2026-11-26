import { Eye, Hand, Monitor, Moon } from "lucide-react";

const cards = [
  {
    icon: Eye,
    title: "While you work",
    body: "An eye sits in the pill while Serion is counting. It is the only thing the app ever asks of your attention.",
  },
  {
    icon: Moon,
    title: "When you step away",
    body: "Five quiet minutes and it stops counting, then subtracts those five from the total. A lunch break never becomes screen time.",
  },
  {
    icon: Hand,
    title: "When nothing is open",
    body: "A locked screen or an empty desktop is not time used, so Serion waits for you to come back.",
  },
];

export function HowItCounts() {
  return (
    <section className="counts" id="counts">
      <div className="container">
        <div className="section-head">
          <h2>It counts you, not the machine.</h2>
        </div>
        <div className="counts-grid">
          {cards.map(({ icon: Icon, title, body }) => (
            <article className="count-card" key={title}>
              <span className="icon-tile">
                <Icon size={22} strokeWidth={1.75} aria-hidden="true" />
              </span>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
        <p className="counts-note">
          <Monitor size={16} strokeWidth={1.75} aria-hidden="true" />
          Video and calls still count while the screen stays awake — you asked the screen to
          keep going.
        </p>
      </div>
    </section>
  );
}
