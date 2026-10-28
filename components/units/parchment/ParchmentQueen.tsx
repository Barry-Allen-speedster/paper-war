"use client";
/** Vintage Parchment — Queen: calligraphic fleur-de-lis crown */
export function ParchmentQueen({ size = 44 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" fill="none" aria-hidden="true">
      <g stroke="#2a1a08" strokeLinecap="round" strokeLinejoin="round" fill="rgba(42,26,8,0.07)">
        {/* Crown body */}
        <path d="M8,34 L10,20 L16,28 L22,10 L28,28 L34,20 L36,34 Z" strokeWidth="1.4" />
        {/* Base bar */}
        <rect x="8" y="34" width="28" height="4" rx="1" strokeWidth="1.2" />
        {/* Center orb */}
        <circle cx="22" cy="10" r="2.5" strokeWidth="1.2" />
        {/* Side orbs */}
        <circle cx="10" cy="19" r="1.8" strokeWidth="1" />
        <circle cx="34" cy="19" r="1.8" strokeWidth="1" />
      </g>
    </svg>
  );
}
