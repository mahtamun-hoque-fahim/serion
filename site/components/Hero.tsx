import { Download } from "lucide-react";
import { URLS } from "@/lib/site";

export function Hero() {
  return (
    <section className="hero" id="top">
      <div className="hero-art" aria-hidden="true">
        <img className="hero-glow" src="/glow-bottom-right.png" alt="" width={871} height={871} />
        <img className="hero-orb-a" src="/orb-small.png" alt="" width={166} height={166} />
        <img className="hero-orb-b" src="/orb-large.png" alt="" width={309} height={309} />
        <img
          className="hero-laptop"
          src="/laptop-video.png"
          alt=""
          width={1049}
          height={609}
          fetchPriority="high"
        />
      </div>

      <div className="container hero-copy">
        <h1>
          Track Screen time
          <span>Gain Productivity</span>
        </h1>
        <p className="hero-sub">
          Serion counts the minutes you are really using your computer.{" "}
          <br />
          And it stops counting the moment you walk away.
        </p>
        <div className="hero-actions">
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
