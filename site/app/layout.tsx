import type { Metadata, Viewport } from "next";
import "@fontsource/google-sans/400.css";
import "@fontsource/google-sans/500.css";
import "@fontsource/google-sans/600.css";
import "@fontsource/google-sans/700.css";
import "./globals.css";
import { VERSION } from "@/lib/site";

export const metadata: Metadata = {
  // Set NEXT_PUBLIC_SITE_URL when the site gets a domain; the fallback keeps
  // social previews absolute until then.
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://serion.pages.dev"),
  title: "Serion: track screen time, gain productivity",
  description:
    "Serion is a small pill at the top of your screen that counts the minutes you are really using your computer, and stops counting the moment you walk away. Free, open source, Windows 10 and 11.",
  applicationName: "Serion",
  keywords: [
    "screen time",
    "screen time tracker",
    "Windows screen time",
    "app usage tracker",
    "desktop widget",
    "open source",
  ],
  authors: [{ name: "Mahtamun Hoque Fahim", url: "https://github.com/mahtamun-hoque-fahim" }],
  openGraph: {
    title: "Serion: track screen time, gain productivity",
    description:
      `See how long you actually used your computer today. A small pill for Windows 10 and 11. v${VERSION}, 1.6 MB, free and open source.`,
    type: "website",
    siteName: "Serion",
  },
  twitter: {
    card: "summary_large_image",
    title: "Serion: track screen time, gain productivity",
    description:
      "A small pill at the top of your screen that counts the time you are actually there.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  colorScheme: "light",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
