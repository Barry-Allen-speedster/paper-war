"use client";
/** Notebook Sketch — Soldier: ballpoint-style cross with slight irregularity */
export function NotebookSoldier({ size = 36 }: { size?: number }) {
  const s = size;
  return (
    <svg width={s} height={s} viewBox="0 0 36 36" fill="none" aria-hidden="true">
      <defs>
        <filter id="roughen-nb">
          <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="3" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="0.8" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
      <g filter="url(#roughen-nb)" stroke="#1a1a2e" strokeWidth="1.4" strokeLinecap="round">
        <line x1="12" y1="10" x2="24" y2="26" />
        <line x1="24" y1="10" x2="12" y2="26" />
        <circle cx="18" cy="18" r="9" strokeDasharray="2 1.5" />
      </g>
    </svg>
  );
}
