import { useId, type CSSProperties } from "react";
import type { BreakKind } from "./types";

/*
 * Break illustrations, 64x64, drawn in the same rounded 2.5px strokes as the
 * pill icons and in currentColor. All motion is CSS (BreakCard.css), so
 * "reduce motion" can stop it in one place.
 */

/** A glass that fills as the break runs (`fill` 0..1), with a wave and bubbles. */
function Water({ fill }: { fill: number }) {
  const clip = useId();
  const glass = "M18 11 H46 L42.6 51.5 Q42.3 55 39 55 H25 Q21.7 55 21.4 51.5 Z";
  return (
    <svg viewBox="0 0 64 64" className="art art-water" aria-hidden>
      <defs>
        <clipPath id={clip}>
          <path d={glass} />
        </clipPath>
      </defs>
      <g className="glass">
        <g clipPath={`url(#${clip})`}>
          {/* The water body moves up as `fill` grows; its top edge is a wave. */}
          <g className="water" style={{ "--fill": fill } as CSSProperties}>
            <path
              className="wave"
              d="M0 15 Q6 11 12 15 T24 15 T36 15 T48 15 T60 15 T72 15 T84 15 T96 15 V64 H0 Z"
            />
            <circle className="bubble b1" cx="27" cy="52" r="1.6" />
            <circle className="bubble b2" cx="34" cy="53" r="1.2" />
            <circle className="bubble b3" cx="38" cy="51" r="1.4" />
          </g>
        </g>
        <path className="line" d={glass} />
      </g>
    </svg>
  );
}

/** A stick figure doing jumping jacks, with a shadow that squashes on landing. */
function Stretch() {
  return (
    <svg viewBox="0 0 64 64" className="art art-stretch" aria-hidden>
      <ellipse className="shadow" cx="32" cy="59" rx="10" ry="2" />
      <g className="body">
        <circle className="line" cx="32" cy="12" r="5" />
        <line className="line" x1="32" y1="17" x2="32" y2="36" />
        <line className="line arm arm-l" x1="32" y1="21" x2="32" y2="35" />
        <line className="line arm arm-r" x1="32" y1="21" x2="32" y2="35" />
        <line className="line leg leg-l" x1="32" y1="36" x2="32" y2="54" />
        <line className="line leg leg-r" x1="32" y1="36" x2="32" y2="54" />
      </g>
    </svg>
  );
}

/** An eye that blinks, then looks off to a faint horizon and back. */
function Eyes() {
  return (
    <svg viewBox="0 0 64 64" className="art art-eyes" aria-hidden>
      <path className="line horizon" d="M6 54 H58 M14 54 L23 45 L29 50 L36 42 L46 54" />
      <g className="eye">
        <path className="line" d="M8 28 Q32 7 56 28 Q32 49 8 28 Z" />
        <g className="iris">
          <circle className="line" cx="32" cy="28" r="9" />
          <circle className="pupil" cx="32" cy="28" r="4.5" />
        </g>
      </g>
    </svg>
  );
}

export function BreakArt({ kind, fill }: { kind: BreakKind; fill: number }) {
  if (kind === "water") return <Water fill={fill} />;
  if (kind === "stretch") return <Stretch />;
  return <Eyes />;
}
