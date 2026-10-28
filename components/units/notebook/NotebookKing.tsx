"use client";
/** Notebook Sketch — King: hand-drawn crown with cross on top */
export function NotebookKing({ size = 52 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 52 52" fill="none" aria-hidden="true">
      <defs>
        <filter id="roughen-nb-k">
          <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="3" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="1" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
      <g filter="url(#roughen-nb-k)" stroke="#1a1a2e" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        {/* Crown base */}
        <polyline points="8,38 12,20 19,30 26,14 33,30 40,20 44,38 8,38" />
        <line x1="8" y1="40" x2="44" y2="40" />
        {/* Cross on top */}
        <line x1="26" y1="8" x2="26" y2="13" />
        <line x1="23" y1="10" x2="29" y2="10" />
        {/* Dots on crown points */}
        <circle cx="8"  cy="19" r="2.2" />
        <circle cx="26" cy="13" r="2.2" />
        <circle cx="44" cy="19" r="2.2" />
      </g>
    </svg>
  );
}
