import { ArrowRight, Download, FileArchive, ShieldAlert } from "lucide-react";
import { INSTALLER, INSTALLER_SIZE, URLS } from "@/lib/site";

const modes = ["Hidden", "Icon", "Full"];

export function Install() {
  return (
    <section className="install" id="install">
      <div className="container">
        <div className="section-head">
          <h2>Two minutes, then it gets out of the way.</h2>
        </div>

        <div className="steps">
          <article className="step">
            <span className="step-num">01</span>
            <h3>Download the installer</h3>
            <p>
              {INSTALLER}, {INSTALLER_SIZE}, from GitHub.
            </p>
            <div className="step-visual">
              <a className="file-row" href={URLS.download} target="_blank" rel="noreferrer">
                <FileArchive size={18} strokeWidth={1.75} aria-hidden="true" />
                <span className="file-name">{INSTALLER}</span>
                <span className="file-size">{INSTALLER_SIZE}</span>
                <Download size={16} strokeWidth={2} aria-hidden="true" />
              </a>
            </div>
          </article>

          <article className="step">
            <span className="step-num">02</span>
            <h3>Run it</h3>
            <p>
              Windows will warn that the installer is not signed yet. Click More info, then Run
              anyway. That is the normal path for a small open-source app.
            </p>
            <div className="step-visual">
              <div className="smartscreen" role="img" aria-label="Windows SmartScreen dialog with More info and Don't run">
                <div className="ss-title">
                  <ShieldAlert size={16} strokeWidth={1.9} aria-hidden="true" />
                  Windows protected your PC
                </div>
                <p className="ss-body">
                  Microsoft Defender SmartScreen prevented an unrecognised app from starting.
                </p>
                <div className="ss-actions">
                  <span className="ss-btn">Don&rsquo;t run</span>
                  <span className="ss-btn ss-more">More info</span>
                </div>
              </div>
              <p className="ss-note">
                <ArrowRight size={13} strokeWidth={2} aria-hidden="true" />
                then <b>Run anyway</b>
              </p>
            </div>
          </article>

          <article className="step">
            <span className="step-num">03</span>
            <h3>Choose how visible you want it</h3>
            <p>
              Serion starts in the tray by the clock. Click the tray icon, then pick Hidden, Icon
              or Full under Pill. Turn on Start at login if you want it every day.
            </p>
            <div className="step-visual">
              <div className="mini-modes" aria-hidden="true">
                {modes.map((name, index) => (
                  <span key={name} className={index === 2 ? "mini-mode is-on" : "mini-mode"}>
                    {name}
                  </span>
                ))}
              </div>
            </div>
          </article>
        </div>

        <div className="install-actions">
          <a className="btn" href={URLS.download} target="_blank" rel="noreferrer">
            <Download size={18} strokeWidth={2} aria-hidden="true" />
            Download for Windows
          </a>
          <a className="link-arrow" href={URLS.latest} target="_blank" rel="noreferrer">
            Latest release on GitHub
            <ArrowRight size={15} strokeWidth={2} aria-hidden="true" />
          </a>
        </div>
        <p className="install-note">
          Uninstall from Windows Settings. Your history is kept unless you tick the box to
          delete it.
        </p>
      </div>
    </section>
  );
}
