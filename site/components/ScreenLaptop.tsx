import { Laptop } from "./Laptop";

/**
 * The owner's blank laptop with a live screen: an hourglass whose sand runs
 * down, then flips and starts again, over "Times up!". Pure SVG + CSS, so it
 * costs no script and stops under reduced motion.
 */
export function ScreenLaptop({
  id,
  className = "",
  reveal,
}: {
  id: string;
  className?: string;
  reveal?: string;
}) {
  const top = `hg-top-${id}`;
  const bottom = `hg-bottom-${id}`;
  return (
    <Laptop className={className} reveal={reveal}>
      <div className="hg-screen">
        <svg className="hourglass" viewBox="0 0 144 166">
          <defs>
            <clipPath id={top}>
              <path d="M31 17H113V34Q113 55 77 74V83H67V74Q31 55 31 34Z" />
            </clipPath>
            <clipPath id={bottom}>
              <path d="M31 149H113V132Q113 111 77 92V83H67V92Q31 111 31 132Z" />
            </clipPath>
          </defs>
          <g className="hg-body">
            <g clipPath={`url(#${top})`}>
              <rect className="hg-sand-top" x="20" y="17" width="104" height="66" />
            </g>
            <g clipPath={`url(#${bottom})`}>
              <rect className="hg-sand-bottom" x="20" y="149" width="104" height="66" />
            </g>
            <line className="hg-stream" x1="72" y1="80" x2="72" y2="148" />
            <path
              className="hg-glass"
              d="M26 12V34Q26 58 62 76V90Q26 108 26 132V154M118 12V34Q118 58 82 76V90Q118 108 118 132V154"
            />
            <rect x="0" y="0" width="144" height="13" rx="6.5" />
            <rect x="0" y="153" width="144" height="13" rx="6.5" />
          </g>
        </svg>
        <p className="laptop-caption">Times up!</p>
      </div>
    </Laptop>
  );
}
