import { ArrowDown, ArrowRight, Download } from "lucide-react";
import { INSTALLER_SIZE, URLS, VERSION } from "@/lib/site";

export function Hero() {
  return (
    <section className="hero" id="top">
      <div className="container hero-grid">
        <div className="hero-copy">
          <h1>See how long you actually used your computer today.</h1>
          <p className="hero-sub">
            Serion is a small pill at the top of your screen. It counts the minutes you are
            really using your computer, and it stops counting the moment you walk away.
          </p>
          <div className="hero-actions">
            <a className="btn" href={URLS.download} target="_blank" rel="noreferrer">
              <Download size={18} strokeWidth={2} aria-hidden="true" />
              Download for Windows
            </a>
            <a className="link-arrow" href="#counts">
              See how it counts
              <ArrowDown size={15} strokeWidth={2} aria-hidden="true" />
            </a>
          </div>
          <p className="hero-meta">
            <span>v{VERSION}</span>
            <span>{INSTALLER_SIZE} installer</span>
            <span>Windows 10 and 11, 64-bit</span>
            <span>Free and open source</span>
          </p>
        </div>

        <div className="hero-shot">
          <img
            src="/pill.png"
            alt="The Serion pill showing 2.9 hours, with its open panel listing today's top apps"
            width={548}
            height={840}
            fetchPriority="high"
          />
        </div>
      </div>
    </section>
  );
}
