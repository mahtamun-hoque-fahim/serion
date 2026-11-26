import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { Problem } from "@/components/Problem";
import { HowItCounts } from "@/components/HowItCounts";
import { Features } from "@/components/Features";
import { DisplayModes } from "@/components/DisplayModes";
import { Showcase } from "@/components/Showcase";
import { Privacy } from "@/components/Privacy";
import { Install } from "@/components/Install";
import { Faq } from "@/components/Faq";
import { FinalCta, Footer } from "@/components/FinalCta";
import { INSTALLER_BYTES, URLS, VERSION } from "@/lib/site";

const software = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Serion",
  applicationCategory: "UtilitiesApplication",
  operatingSystem: "Windows 10, Windows 11",
  softwareVersion: VERSION,
  fileSize: INSTALLER_BYTES,
  license: URLS.license,
  isAccessibleForFree: true,
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  description:
    "A small pill at the top of the screen that counts the time you are actually using your Windows computer, and stops counting when you walk away.",
  downloadUrl: URLS.download,
  codeRepository: URLS.repo,
};

export default function Home() {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Header />
      <main id="main">
        <Hero />
        <Problem />
        <HowItCounts />
        <Features />
        <DisplayModes />
        <Showcase />
        <Privacy />
        <Install />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(software) }}
      />
    </>
  );
}
