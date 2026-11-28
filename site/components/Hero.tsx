import { Download } from "lucide-react";
import { URLS } from "@/lib/site";

export function Hero() {
  return (
    <section className="hero" id="top">
      <div className="hero-art" aria-hidden="true">
        <img data-reveal data-drift className="hero-glow" src="/glow-bottom-right.png" alt="" width={871} height={871} />
        <img data-reveal="2" data-drift className="hero-orb-a" src="/orb-small.png" alt="" width={166} height={166} />
        <img data-reveal="3" data-drift="x" className="hero-orb-b" src="/orb-large.png" alt="" width={309} height={309} />
        <div className="hero-laptop hero-shot" data-reveal="2">
          <img src="/hero-dashboard.png" alt="" width={1296} height={718} />
        </div>
      </div>

      <div className="container hero-copy">
        <h1 data-reveal>
          Track Screen time
          <span>Gain Productivity</span>
        </h1>
        <p className="hero-sub" data-reveal="1">
          Serion counts the minutes you are really using your computer.{" "}
          <br />
          And it stops counting the moment you walk away.
        </p>
        <div className="hero-actions" data-reveal="2">
          <a className="btn" href={URLS.download} target="_blank" rel="noreferrer">
            <Download size={16} strokeWidth={2} aria-hidden="true" />
            Download for Windows
          </a>
          <a className="btn btn-ghost" href="#counts">
            How it counts?
          </a>
        </div>
      </div>
    </section>
  );
}
