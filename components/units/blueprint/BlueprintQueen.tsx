"use client";
/** Neon Blueprint — Queen: wireframe diamond with glow */
export function BlueprintQueen({ size = 44 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" fill="none" aria-hidden="true">
      <defs>
        <filter id="glow-bp-q">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <g filter="url(#glow-bp-q)" stroke="#00e5ff" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="22,6 36,22 22,38 8,22" />
        <polygon points="22,13 29,22 22,31 15,22" />
        <line x1="8"  y1="22" x2="15" y2="22" />
        <line x1="29" y1="22" x2="36" y2="22" />
        <circle cx="22" cy="6"  r="1.5" fill="#00e5ff" />
        <circle cx="22" cy="38" r="1.5" fill="#00e5ff" />
        <circle cx="8"  cy="22" r="1.5" fill="#00e5ff" />
        <circle cx="36" cy="22" r="1.5" fill="#00e5ff" />
      </g>
    </svg>
  );
}
