import { Download } from "lucide-react";
import { SerionMark } from "./SerionMark";
import { URLS } from "@/lib/site";

const links = [
  { href: "#counts", label: "How it counts" },
  { href: "#features", label: "What you get" },
  { href: "#privacy", label: "Privacy" },
  { href: "#install", label: "Install" },
];

export function Header() {
  return (
    <header className="site-header">
      <div className="container header-bar">
        <a className="wordmark" href="#top" aria-label="Serion, back to top">
          <SerionMark size={22} />
          <span>Serion</span>
        </a>
        <nav className="nav" aria-label="Sections">
          {links.map((link) => (
            <a key={link.href} href={link.href}>
              {link.label}
            </a>
          ))}
        </nav>
        <a className="btn btn-sm header-cta" href={URLS.download} target="_blank" rel="noreferrer">
          <Download size={16} strokeWidth={2} aria-hidden="true" />
          Download for Windows
        </a>
      </div>
    </header>
  );
}
