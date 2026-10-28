"use client";
/** Notebook Sketch — Queen: hand-drawn crown */
export function NotebookQueen({ size = 44 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" fill="none" aria-hidden="true">
      <defs>
        <filter id="roughen-nb-q">
          <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="3" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="0.9" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
      <g filter="url(#roughen-nb-q)" stroke="#1a1a2e" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="8,30 12,16 18,24 22,12 26,24 32,16 36,30 8,30" />
        <line x1="8" y1="32" x2="36" y2="32" />
        <circle cx="8"  cy="15" r="2" />
        <circle cx="22" cy="11" r="2" />
        <circle cx="36" cy="15" r="2" />
      </g>
    </svg>
  );
}
