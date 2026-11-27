import { Download, Eye } from "lucide-react";
import { ScreenLaptop } from "./ScreenLaptop";
import { SerionMark } from "./SerionMark";
import { URLS } from "@/lib/site";

export function FinalCta() {
  return (
    <section className="cta">
      <div className="cta-art" aria-hidden="true">
        <img className="cta-glow-a" src="/glow-bottom-right.png" alt="" width={871} height={871} />
        <img className="cta-orb" src="/orb-large.png" alt="" width={309} height={309} />
        <img className="cta-glow-b" src="/glow-top-left.png" alt="" width={651} height={651} />
      </div>

      <div className="cta-device" aria-hidden="true">
        <ScreenLaptop id="cta" />
        <span className="cta-break">
          <Eye size={22} strokeWidth={1.8} />
          Take a Break
        </span>
      </div>

      <div className="container cta-grid">
        <div className="cta-copy">
          <h2>Start today.</h2>
          <p>
            Install Serion and look at the times wasted.{" "}
            <br />
            30 seconds to set up, and find your true potential.
          </p>
          <a className="btn btn-lg" href={URLS.download} target="_blank" rel="noreferrer">
            <Download size={16} strokeWidth={2} aria-hidden="true" />
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
          <SerionMark size={24} />
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
