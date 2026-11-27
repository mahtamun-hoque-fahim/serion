import type { ReactNode } from "react";

/**
 * The owner's blank laptop (laptop-blank.png) with a live screen. Children
 * fill the screen; size them in cqw (1cqw = 1% of the laptop's width) so they
 * scale with it.
 */
export function Laptop({
  className = "",
  reveal,
  children,
}: {
  className?: string;
  reveal?: string;
  children: ReactNode;
}) {
  return (
    <div className={`laptop-shot ${className}`} aria-hidden="true" data-reveal={reveal}>
      <img src="/laptop-blank.png" alt="" width={1049} height={609} />
      <div className="laptop-ui">{children}</div>
    </div>
  );
}
