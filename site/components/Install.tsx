"use client";

import { useRef } from "react";
import {
  ArrowUpRight,
  Check,
  Download,
  Eye,
  FileArchive,
  MousePointer2,
  ShieldAlert,
} from "lucide-react";
import { Laptop } from "./Laptop";
import { SerionMark } from "./SerionMark";
import { useScrollStep } from "@/lib/useScrollStep";
import { INSTALLER, INSTALLER_SIZE, RELEASE_TAG, URLS } from "@/lib/site";

const steps = [
  {
    title: "Download the installer",
    body: `${INSTALLER}, ${INSTALLER_SIZE}, from GitHub.`,
  },
  {
    title: "Run it",
    body: "Windows will warn that the installer is not signed yet. Click More info, then Run anyway. That is the normal path for a small open-source app.",
  },
  {
    title: "Choose how visible you want it",
    body: "Serion starts in the tray by the clock. Click the tray icon, then pick Hidden, Icon or Full under Pill. Turn on Start at login if you want it every day.",
  },
];

/**
 * The three install steps, played out on the laptop as you scroll: the
 * download, the SmartScreen warning, then picking the pill in the tray menu.
 */
export function Install() {
  const section = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLOListElement>(null);
  const [step, choose] = useScrollStep(section, list, steps.length);

  return (
    <section className="install" id="install">
      <div className="install-scene" ref={section}>
        <div className="install-stage">
          <div className="container">
            <div className="install-head" data-reveal>
              <h2>
                <span className="accent">30 Seconds</span>, That&rsquo;s it.
              </h2>
            </div>

            <div className="install-grid">
              <ol className="steps" ref={list} data-reveal="1">
                {steps.map((item, index) => (
                  <li key={item.title}>
                    <button
                      type="button"
                      className={step === index ? "step-card is-active" : "step-card"}
                      onClick={() => choose(index)}
                      aria-pressed={step === index}
                    >
                      <span className="step-num">0{index + 1}</span>
                      <span className="step-title">{item.title}</span>
                      <span className="step-body">{item.body}</span>
                    </button>
                  </li>
                ))}
              </ol>

              <Laptop className="install-laptop" reveal="2">
                <div className="inst-screen" data-step={step}>
                  {/* 1. The release page, and the download running. */}
                  <div className="inst-panel inst-download">
                    <div className="mb-bar">
                      <span className="mb-dots">
                        <i />
                        <i />
                        <i />
                      </span>
                      <span className="mb-url">github.com/&hellip;/serion/releases</span>
                    </div>
                    <div className="mb-page">
                      <p className="mb-title">Serion {RELEASE_TAG}</p>
                      <p className="mb-sub">Assets</p>
                      <div className="mb-asset">
                        <FileArchive strokeWidth={1.8} />
                        <span>{INSTALLER}</span>
                        <em>{INSTALLER_SIZE}</em>
                      </div>
                      <MousePointer2 className="inst-cursor inst-cursor--asset" fill="#fff" />
                    </div>
                    <div className="mb-download">
                      <Download strokeWidth={2} />
                      <div className="mb-dl-text">
                        <span>{INSTALLER}</span>
                        <i className="mb-progress">
                          <b />
                        </i>
                      </div>
                      <Check className="mb-done" strokeWidth={2.4} />
                    </div>
                  </div>

                  {/* 2. SmartScreen: More info, then Run anyway. */}
                  <div className="inst-panel inst-warn">
                    <div className="ss-window">
                      <p className="ss-head">
                        <ShieldAlert strokeWidth={1.8} />
                        Windows protected your PC
                      </p>
                      <p className="ss-text">
                        Microsoft Defender SmartScreen prevented an unrecognised app from
                        starting.
                      </p>
                      <p className="ss-link">More info</p>
                      <div className="ss-details">
                        <p>App: {INSTALLER}</p>
                        <p>Publisher: Unknown publisher</p>
                      </div>
                      <div className="ss-buttons">
                        <span className="ss-run">Run anyway</span>
                        <span>Don&rsquo;t run</span>
                      </div>
                      <MousePointer2 className="inst-cursor inst-cursor--run" fill="#fff" />
                    </div>
                  </div>

                  {/* 3. The tray menu: pick Full, and the pill appears. */}
                  <div className="inst-panel inst-tray">
                    <div className="scr-pill tray-pill">
                      <span className="scr-pill-icon">
                        <Eye strokeWidth={1.9} />
                      </span>
                      <span className="scr-pill-time">0.0h</span>
                    </div>
                    <div className="tray-menu">
                      <p className="tray-label">Pill</p>
                      <div className="tray-seg">
                        <span>Hidden</span>
                        <span>Icon</span>
                        <span>Full</span>
                        <i className="tray-thumb" />
                      </div>
                      <p className="tray-row">Start at login</p>
                    </div>
                    <div className="tray-bar">
                      <span className="tray-icon">
                        <SerionMark size={10} />
                      </span>
                      <span className="tray-clock">9:41</span>
                    </div>
                  </div>
                </div>
              </Laptop>
            </div>
          </div>
        </div>
      </div>

      <div className="container install-actions" data-reveal>
        <a className="btn" href={URLS.download} target="_blank" rel="noreferrer">
          <Download size={18} strokeWidth={2} aria-hidden="true" />
          Download for Windows
        </a>
        <a className="link-arrow" href={URLS.latest} target="_blank" rel="noreferrer">
          Latest release on GitHub
          <ArrowUpRight size={15} strokeWidth={2} aria-hidden="true" />
        </a>
      </div>
    </section>
  );
}
