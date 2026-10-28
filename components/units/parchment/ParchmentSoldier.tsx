"use client";
/** Vintage Parchment — Soldier: calligraphic dagger */
export function ParchmentSoldier({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none" aria-hidden="true">
      <g stroke="#2a1a08" strokeLinecap="round" strokeLinejoin="round">
        {/* Blade */}
        <path d="M18 6 L21 26 L18 30 L15 26 Z" strokeWidth="1.3" fill="rgba(42,26,8,0.08)" />
        {/* Guard */}
        <line x1="12" y1="26" x2="24" y2="26" strokeWidth="2" />
        {/* Handle */}
        <rect x="16" y="28" width="4" height="6" rx="1" strokeWidth="1.2" fill="rgba(42,26,8,0.12)" />
        {/* Fuller (groove) */}
        <line x1="18" y1="9" x2="18" y2="24" strokeWidth="0.7" />
      </g>
    </svg>
  );
}
