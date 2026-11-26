import type { Metadata } from "next";
import { ArrowLeft, Download } from "lucide-react";
import { SerionMark } from "@/components/SerionMark";
import { URLS } from "@/lib/site";

export const metadata: Metadata = {
  title: "Page not found · Serion",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <main className="not-found" id="main">
      <div className="not-found-inner">
        <a className="wordmark" href="/" aria-label="Serion, back to the start">
          <SerionMark size={26} />
          <span>Serion</span>
        </a>

        <p className="not-found-code">404</p>
        <h1>This page doesn&rsquo;t exist. The installer does.</h1>
        <p className="not-found-body">
          The link you followed is old or mistyped. Everything about Serion lives on one page.
        </p>

        <div className="not-found-actions">
          <a className="btn" href={URLS.download} target="_blank" rel="noreferrer">
            <Download size={18} strokeWidth={2} aria-hidden="true" />
            Download for Windows
          </a>
          <a className="link-arrow" href="/">
            <ArrowLeft size={16} strokeWidth={2} aria-hidden="true" />
            Back to the page
          </a>
        </div>
      </div>
    </main>
  );
}
