import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/FinalCta";
import { ScrollFx } from "@/components/ScrollFx";
import { PolicyToc } from "@/components/PolicyToc";
import { URLS } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy · Serion",
  description:
    "What the Serion app records, where it keeps it, what leaves your computer (only an update check), and what this website collects (nothing beyond server logs).",
  alternates: { canonical: "/privacy/" },
};

const UPDATED = "28 November 2026";

type Part = { id: string; title: string; summary: string; body: ReactNode };

/* Every statement here is checked against the app's source (src-tauri/src,
   src/Dashboard.tsx) and the site's. Change the code, change this page. */
const parts: Part[] = [
  {
    id: "scope",
    title: "Who this covers",
    summary: "This page covers the Serion app and this website, both made by one person.",
    body: (
      <>
        <p>
          Serion is a free, open-source screen-time counter for Windows 10 and 11, made by
          Mahtamun Hoque Fahim. This page explains how the Serion app and this website handle
          information about you. It covers the app you install, the files it writes, the one
          request it makes over the internet, and the site you are reading now.
        </p>
        <p>
          There is no company, no account system and no server of our own behind Serion. The
          source code is public on <a href={URLS.repo}>GitHub</a>, so every claim below can be
          checked against the code that makes it true.
        </p>
      </>
    ),
  },
  {
    id: "records",
    title: "What the app records",
    summary: "Which app is in front and for how long; nothing you type, see or say.",
    body: (
      <>
        <p>
          Once a second, Serion asks Windows which window is in front and which program owns it.
          From that it keeps, for each day:
        </p>
        <ul>
          <li>your total screen time for the day;</li>
          <li>the time spent in each app, stored under the app&rsquo;s name (for example &ldquo;Firefox&rdquo; or &ldquo;Microsoft Word&rdquo;);</li>
          <li>your settings: limits, timers, break reminders, the pill&rsquo;s look and where it sits.</li>
        </ul>
        <p>
          The app name comes from the program&rsquo;s own description in its file, or for apps from
          the Microsoft Store, from the app&rsquo;s package. A few built-in Windows apps, such as
          Settings, Calculator and Photos, all run inside one shared Windows host that has no name
          of its own. For those, Serion uses the window&rsquo;s title as the name, and a title can
          include what that app shows in it, such as the name of the photo you have open. That
          title is stored only as an app name in your own encrypted files.
        </p>
        <p>To decide whether a second counts, Serion also checks, without storing any of it:</p>
        <ul>
          <li>
            how long ago you last used the mouse or keyboard, as a single number of milliseconds
            from Windows. Serion never sees which keys or buttons you pressed, or where;
          </li>
          <li>whether something, such as a video or a call, is keeping your screen awake;</li>
          <li>
            the titles of windows, only to tell real apps apart from parts of Windows itself, like
            the desktop, the taskbar or the lock screen;
          </li>
          <li>
            your battery level, only if you turn on &ldquo;quit when the battery is low&rdquo;.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "never",
    title: "What it never records",
    summary: "No keystrokes, screenshots, browsing history, window contents or files.",
    body: (
      <>
        <p>Serion does not record, capture or store:</p>
        <ul>
          <li>anything you type, or which keys you press;</li>
          <li>screenshots, screen recordings, or anything that is on your screen;</li>
          <li>the websites you visit, the pages you read or the links you click;</li>
          <li>the documents, messages or files you open (other than the title case explained above);</li>
          <li>your microphone, camera or location;</li>
          <li>your name, email address or any account, because there is no account.</li>
        </ul>
        <p>
          Serion has no telemetry, crash reporting or usage analytics. It does not tell anyone
          that you installed it, opened it or how you use it.
        </p>
      </>
    ),
  },
  {
    id: "storage",
    title: "Where your data lives",
    summary: "On your own PC, in encrypted files that only Serion opens.",
    body: (
      <>
        <p>
          Everything Serion records stays on your computer. By default it lives in{" "}
          <code>%APPDATA%\com.serion.app</code>: one file per day in a <code>history</code>{" "}
          folder, and one file for your settings. You can move this data folder anywhere you like
          from the dashboard.
        </p>
        <p>
          Each file is encrypted with AES-256-GCM, so opening it in another program shows nothing
          readable, and a file that has been changed outside Serion is refused instead of trusted.
          To be clear about the limit: the key is built into the app so it can open your files
          without asking for a password. Someone who takes the app apart could recover it, so the
          encryption keeps casual eyes and other programs out, not a determined attacker who
          already has your files and the app.
        </p>
        <p>
          A few look-and-feel choices (theme colour, pill size, display mode, sounds) are kept in
          the app window&rsquo;s own storage on your PC. They describe the pill, not you.
        </p>
      </>
    ),
  },
  {
    id: "retention",
    title: "How long it is kept",
    summary: "30 days by default, up to 5 years, and you can delete it any time.",
    body: (
      <>
        <p>
          Serion keeps your history for 30 days unless you choose otherwise. In the dashboard you
          can pick 7 days, 30 days, 90 days, 6 months, 1 year, 2 years or 5 years. Days older than
          your choice are deleted automatically.
        </p>
        <p>
          &ldquo;Clear all&rdquo; in the dashboard deletes your whole history at once, after a
          second click to confirm. You can also simply delete the data folder. Uninstalling
          Serion removes the app; if you want your history gone too, clear it first or delete the
          data folder.
        </p>
      </>
    ),
  },
  {
    id: "network",
    title: "What leaves your computer",
    summary: "Only an update check to GitHub; your usage never leaves your PC.",
    body: (
      <>
        <p>
          Serion makes one kind of internet request: it checks whether a newer version exists.
          When the dashboard opens, and every 6 hours while it stays open, it downloads a small
          file, <code>latest.json</code>, from Serion&rsquo;s release page on GitHub. The request
          carries nothing about you or your usage. Like any visit to a website, it does reach
          GitHub from your IP address, with the usual technical details of a web request.
        </p>
        <p>
          If a newer version is out, the dashboard shows a banner. Nothing is downloaded until you
          click it. Then the installer comes from GitHub, its signature is checked against a key
          built into Serion, and it installs and restarts the app.
        </p>
        <p>
          If you are offline, the check fails quietly and Serion keeps counting as usual. Your
          screen time, app list and settings are never sent anywhere.
        </p>
      </>
    ),
  },
  {
    id: "exports",
    title: "Exports and moving your data",
    summary: "Exports are encrypted files that go only where you save them.",
    body: (
      <>
        <p>
          The dashboard can export your history and settings to a single <code>.serion</code>{" "}
          file, encrypted the same way as the data folder. It is saved where you choose and goes
          nowhere else. Who you share it with is up to you.
        </p>
        <p>
          Importing a file checks it first: dates must be real and not in the future, and no day
          or app can hold more than 24 hours. Days older than your history setting are skipped,
          and the dashboard tells you how many.
        </p>
      </>
    ),
  },
  {
    id: "recordings",
    title: "Screen recordings and sharing",
    summary: "One switch hides the pill from recordings, screen shares and screenshots.",
    body: (
      <p>
        If you stream, record or share your screen, turn on &ldquo;Hide Serion from
        recordings&rdquo;. Windows then leaves the pill and its alerts out of OBS, screen
        sharing in meeting apps and screenshots, while you still see them on your own screen.
        The dashboard is a normal window and still shows up. The switch is off by default.
      </p>
    ),
  },
  {
    id: "website",
    title: "This website",
    summary: "No cookies, no analytics and no tracking; only the host's normal server logs.",
    body: (
      <>
        <p>
          This site is a set of plain files. It sets no cookies, stores nothing in your browser,
          runs no analytics and loads no advertising or tracking scripts. Its fonts and images are
          served from the site itself, not from a third party.
        </p>
        <p>
          The site is hosted by <a href="https://vercel.com/legal/privacy-policy">Vercel</a>.
          Like any web host, Vercel keeps short-lived server logs of requests, such as your IP
          address, the page asked for, the time and your browser type, to deliver the site and
          protect it from abuse. We do not use those logs to profile anyone.
        </p>
        <p>
          The download buttons and the GitHub links take you to GitHub, which then handles your
          visit under its own privacy statement.
        </p>
      </>
    ),
  },
  {
    id: "others",
    title: "Other companies involved",
    summary: "GitHub, Vercel and Microsoft each handle a small part, under their own policies.",
    body: (
      <>
        <ul>
          <li>
            <strong>GitHub</strong> hosts the source code, the installer and the update file. It
            sees your IP address when you download Serion or when the app checks for updates.{" "}
            <a href="https://docs.github.com/site-policy/privacy-policies/github-general-privacy-statement">
              GitHub&rsquo;s privacy statement
            </a>
            .
          </li>
          <li>
            <strong>Vercel</strong> hosts this website, as described above.{" "}
            <a href="https://vercel.com/legal/privacy-policy">Vercel&rsquo;s privacy policy</a>.
          </li>
          <li>
            <strong>Microsoft</strong> makes Windows and Edge WebView2, the component that draws
            Serion&rsquo;s pill and dashboard. WebView2 is kept up to date by Windows and follows
            your Windows diagnostic and privacy settings, not Serion&rsquo;s.{" "}
            <a href="https://www.microsoft.com/privacy/privacystatement">Microsoft&rsquo;s privacy statement</a>.
          </li>
        </ul>
        <p>Serion does not sell, share or hand over any data, because it never has any to give.</p>
      </>
    ),
  },
  {
    id: "choices",
    title: "Your choices",
    summary: "You can see, export, move or delete everything yourself, with no account.",
    body: (
      <>
        <p>
          Because your data never leaves your computer, you do not need to ask anyone for it. In
          the dashboard you can:
        </p>
        <ul>
          <li>see every day and every app Serion has counted;</li>
          <li>export everything to a file;</li>
          <li>move the data folder;</li>
          <li>shorten how long history is kept;</li>
          <li>clear all of it.</li>
        </ul>
        <p>
          There is no copy anywhere else to request, correct or delete. Uninstalling Serion stops
          all recording, including the update check.
        </p>
      </>
    ),
  },
  {
    id: "changes",
    title: "Changes to this page",
    summary: "Changes are dated here, and every edit is public on GitHub.",
    body: (
      <p>
        If Serion starts handling information differently, this page changes first and its date
        at the top moves. The page is part of the public source, so its full history of edits is
        on <a href={URLS.repo}>GitHub</a>.
      </p>
    ),
  },
  {
    id: "contact",
    title: "Questions",
    summary: "Ask on GitHub; there is no hidden inbox.",
    body: (
      <p>
        For any question about this page or about how Serion handles data, open an issue on{" "}
        <a href={URLS.issues}>GitHub</a>.
      </p>
    ),
  },
];

export default function Privacy() {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Header />
      <main id="main" className="policy">
        <div className="container policy-head" data-reveal>
          <h1>
            Your screen time,
            <br />
            your computer.
          </h1>
          <p className="policy-lede">
            Serion counts which app is in front and for how long, keeps it in encrypted files on
            your PC, and sends none of it anywhere. Each part below has a one-line summary if you
            only want the gist.
          </p>
          <p className="policy-date">Last updated {UPDATED}</p>
        </div>

        <div className="container policy-grid">
          <PolicyToc items={parts.map(({ id, title }) => ({ id, title }))} />

          <div className="policy-parts">
            {parts.map((part) => (
              <section key={part.id} id={part.id} className="policy-part" aria-labelledby={`${part.id}-h`} data-reveal>
                <h2 id={`${part.id}-h`}>{part.title}</h2>
                <details className="policy-sum">
                  <summary>
                    Summary
                    <ChevronDown size={15} strokeWidth={2} aria-hidden="true" />
                  </summary>
                  <p>{part.summary}</p>
                </details>
                <div className="policy-body">{part.body}</div>
              </section>
            ))}
          </div>
        </div>
      </main>
      <Footer />
      <ScrollFx />
    </>
  );
}
