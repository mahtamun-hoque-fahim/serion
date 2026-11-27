import { Download, Eye } from "lucide-react";
import { LaptopMockup, VideoScreen } from "./Laptop";
import { SerionMark } from "./SerionMark";
import { URLS } from "@/lib/site";

export function FinalCta() {
  return (
    <section className="cta">
      {/* CSS placeholders for the background artwork the owner is providing. */}
      <div className="cta-orbs" aria-hidden="true">
        <span className="orb orb--cta-a" />
        <span className="orb orb--cta-b" />
      </div>

      <div className="container cta-grid">
        <div className="cta-device">
          {/* Screen slot: replace VideoScreen with the provided laptop mockup. */}
          <LaptopMockup variant="cta" screen={<VideoScreen />} />
          <span className="cta-break" aria-hidden="true">
            <Eye size={16} strokeWidth={2} />
            Take a Break
          </span>
        </div>

        <div className="cta-copy">
          <h2>Start today.</h2>
          <p>
            Install Serion and see the time you actually used. 30 seconds to set up, and find
            your true potential.
          </p>
          <a className="btn" href={URLS.download} target="_blank" rel="noreferrer">
            <Download size={18} strokeWidth={2} aria-hidden="true" />
            Download for Windows
          </a>
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  const links = [
    { href: URLS.repo, label: "GitHub" },
    { href: URLS.releases, label: "Releases" },
    { href: URLS.changelog, label: "Changelog" },
    { href: URLS.license, label: "License (MIT)" },
    { href: URLS.credits, label: "Credits" },
  ];

  return (
    <footer className="site-footer">
      <div className="container footer-bar">
        <a className="wordmark" href="#top" aria-label="Serion, back to top">
          <SerionMark size={22} />
          <span>Serion</span>
        </a>

        <nav className="footer-links" aria-label="Project links">
          {links.map((link) => (
            <a key={link.href} href={link.href} target="_blank" rel="noreferrer">
              {link.label}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}
