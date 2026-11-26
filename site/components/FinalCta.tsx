import { Download } from "lucide-react";
import { URLS } from "@/lib/site";

export function FinalCta() {
  return (
    <section className="cta">
      <div className="container cta-inner">
        <h2>Start with today.</h2>
        <p>
          Install Serion and look at the real number tonight. Two minutes to set up, and it will
          not interrupt your work.
        </p>
        <a className="btn" href={URLS.download} target="_blank" rel="noreferrer">
          <Download size={18} strokeWidth={2} aria-hidden="true" />
          Download for Windows
        </a>
        <p className="cta-meta">Free · Open source · Windows 10 and 11</p>
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
      <div className="container footer-grid">
        <div className="footer-brand">
          <p className="footer-title">Serion</p>
          <p>Screen time, counted honestly.</p>
        </div>

        <nav className="footer-links" aria-label="Project links">
          {links.map((link) => (
            <a key={link.href} href={link.href} target="_blank" rel="noreferrer">
              {link.label}
            </a>
          ))}
        </nav>

        <p className="footer-note">
          Built for Windows 10 and 11.
          <br />
          Never sends your data anywhere.
        </p>
      </div>
    </footer>
  );
}
