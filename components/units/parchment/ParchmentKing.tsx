"use client";
/** Vintage Parchment — King: calligraphic imperial crown with orb */
export function ParchmentKing({ size = 52 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 52 52" fill="none" aria-hidden="true">
      <g stroke="#2a1a08" strokeLinecap="round" strokeLinejoin="round" fill="rgba(42,26,8,0.08)">
        {/* Crown body */}
        <path d="M8,40 L11,22 L18,32 L26,10 L34,32 L41,22 L44,40 Z" strokeWidth="1.6" />
        {/* Base */}
        <rect x="8" y="40" width="36" height="5" rx="1.5" strokeWidth="1.4" />
        {/* Orb on top */}
        <circle cx="26" cy="9"  r="3.5" strokeWidth="1.4" />
        {/* Cross above orb */}
        <line x1="26" y1="4"  x2="26" y2="6"  strokeWidth="1.8" />
        <line x1="24" y1="5"  x2="28" y2="5"  strokeWidth="1.8" />
        {/* Side jewels */}
        <circle cx="11" cy="21" r="2"   strokeWidth="1" />
        <circle cx="41" cy="21" r="2"   strokeWidth="1" />
        {/* Inner arch */}
        <path d="M14,40 Q26,28 38,40" strokeWidth="0.8" fill="none" />
      </g>
    </svg>
  );
}
