import { Download } from "lucide-react";
import { LaptopMockup, VideoScreen } from "./Laptop";
import { URLS } from "@/lib/site";

export function Hero() {
  return (
    <section className="hero" id="top">
      {/* CSS placeholders for the background artwork the owner is providing. */}
      <div className="hero-orbs" aria-hidden="true">
        <span className="orb orb--hero-a" />
        <span className="orb orb--hero-b" />
        <span className="orb orb--hero-c" />
      </div>

      <div className="container hero-grid">
        <div className="hero-copy">
          <h1>
            Track Screen time
            <span>Gain Productivity</span>
          </h1>
          <p className="hero-sub">
            Serion counts the minutes you are really using your computer. And it stops
            counting the moment you walk away.
          </p>
          <div className="hero-actions">
            <a className="btn" href={URLS.download} target="_blank" rel="noreferrer">
              <Download size={18} strokeWidth={2} aria-hidden="true" />
              Download for Windows
            </a>
            <a className="btn btn-ghost" href="#counts">
              How it counts?
            </a>
          </div>
        </div>

        <div className="hero-device">
          {/* Screen slot: replace VideoScreen with the provided laptop mockup. */}
          <LaptopMockup variant="hero" screen={<VideoScreen />} />
        </div>
      </div>
    </section>
  );
}
