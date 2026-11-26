import { ChevronDown } from "lucide-react";

const questions = [
  {
    q: "Is it really free?",
    a: "Yes. It is MIT licensed. No account, no trial, no upsell.",
  },
  {
    q: "Which Windows versions?",
    a: "Windows 10 and 11, 64-bit. There is no Mac version yet.",
  },
  {
    q: "Will it slow my computer down?",
    a: "It records which window is in front and for how long. There is no video capture, no keystroke logging and no background indexing, so there is almost nothing to use your processor for.",
  },
  {
    q: "Does it see what I type or what is on my screen?",
    a: "No. Serion stores app names and durations. Nothing else.",
  },
  {
    q: "Why does Windows warn about the installer?",
    a: "The installer is not code-signed yet. Click More info, then Run anyway, or build it yourself from the public source.",
  },
  {
    q: "Can I keep it out of my recordings?",
    a: "Yes. Turn on Hide Serion from recordings and it disappears from OBS, screen sharing and screenshots, while you still see it on your own screen.",
  },
];

export function Faq() {
  return (
    <section className="faq" id="faq">
      <div className="container faq-grid">
        <div className="faq-head">
          <h2>Before you install</h2>
          <p>Short answers to the things people ask first.</p>
        </div>

        <div className="faq-list">
          {questions.map((item) => (
            <details key={item.q}>
              <summary>
                <span>{item.q}</span>
                <ChevronDown size={18} strokeWidth={2} aria-hidden="true" />
              </summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
