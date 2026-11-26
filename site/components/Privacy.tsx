import { HardDrive, History, Lock, WifiOff } from "lucide-react";
import { URLS } from "@/lib/site";

const points = [
  {
    icon: HardDrive,
    title: "Stored locally",
    body: "In your own Windows profile, in a folder you can move anywhere you like.",
  },
  {
    icon: Lock,
    title: "Encrypted on disk",
    body: "The files read as noise. Open one in a text editor and there is nothing to see.",
  },
  {
    icon: WifiOff,
    title: "No account, no sync",
    body: "No sign-in, no cloud, no analytics. Serion never sends anything over the internet.",
  },
  {
    icon: History,
    title: "Yours to keep or erase",
    body: "Choose how long history is kept, and export a backup whenever you like.",
  },
];

export function Privacy() {
  return (
    <section className="privacy" id="privacy">
      <div className="container">
        <div className="privacy-head">
          <h2>Your day stays on your PC.</h2>
          <p>No account. No cloud. Nothing leaves this computer.</p>
        </div>

        <div className="privacy-grid">
          {points.map(({ icon: Icon, title, body }) => (
            <article className="privacy-card" key={title}>
              <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>

        <p className="privacy-link">
          <a href={URLS.license} target="_blank" rel="noreferrer">
            Open source under the MIT license
          </a>{" "}
          — you can read the code that touches your data.
        </p>
      </div>
    </section>
  );
}
