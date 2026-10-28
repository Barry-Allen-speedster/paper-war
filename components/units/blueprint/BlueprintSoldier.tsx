"use client";
/** Neon Blueprint — Soldier: wireframe target reticle with glow */
export function BlueprintSoldier({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none" aria-hidden="true">
      <defs>
        <filter id="glow-bp-s">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <g filter="url(#glow-bp-s)" stroke="#00e5ff" strokeWidth="1.2" strokeLinecap="round">
        <circle cx="18" cy="18" r="9" />
        <circle cx="18" cy="18" r="4" />
        <line x1="8"  y1="18" x2="13" y2="18" />
        <line x1="23" y1="18" x2="28" y2="18" />
        <line x1="18" y1="8"  x2="18" y2="13" />
        <line x1="18" y1="23" x2="18" y2="28" />
      </g>
    </svg>
  );
}
