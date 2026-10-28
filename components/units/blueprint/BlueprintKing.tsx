"use client";
/** Neon Blueprint — King: wireframe fortress / castle silhouette with glow */
export function BlueprintKing({ size = 52 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 52 52" fill="none" aria-hidden="true">
      <defs>
        <filter id="glow-bp-k">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <g filter="url(#glow-bp-k)" stroke="#00e5ff" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        {/* Battlements */}
        <polyline points="10,20 10,15 15,15 15,20" />
        <polyline points="23,20 23,15 29,15 29,20" />
        <polyline points="37,20 37,15 42,15 42,20" />
        {/* Walls */}
        <polyline points="10,20 10,38 42,38 42,20 10,20" />
        {/* Gate */}
        <path d="M22,38 L22,30 Q26,26 30,30 L30,38" />
        {/* Inner cross */}
        <line x1="26" y1="20" x2="26" y2="28" />
        <line x1="22" y1="24" x2="30" y2="24" />
        {/* Corner dots */}
        <circle cx="10" cy="20" r="1.5" fill="#00e5ff" />
        <circle cx="42" cy="20" r="1.5" fill="#00e5ff" />
        <circle cx="10" cy="38" r="1.5" fill="#00e5ff" />
        <circle cx="42" cy="38" r="1.5" fill="#00e5ff" />
      </g>
    </svg>
  );
}
