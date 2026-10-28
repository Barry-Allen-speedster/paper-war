"use client";
/**
 * Stick-figure unit SVG components used on the deployment board and battlefield.
 * Each unit is a small stick figure with a role-specific accessory:
 *   Soldier — stick figure holding a sword
 *   Queen   — stick figure with a crown
 *   King    — stick figure with a large crown and cape
 */

interface Props {
  size?: number;
  color?: string;
}

export function SoldierFigure({ size = 40, color = "currentColor" }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
      style={{ display: "block" }}
    >
      {/* Head */}
      <circle cx="20" cy="7" r="4" stroke={color} strokeWidth="2" />
      {/* Body */}
      <line x1="20" y1="11" x2="20" y2="25" stroke={color} strokeWidth="2" strokeLinecap="round" />
      {/* Left arm — sword arm raised */}
      <line x1="20" y1="15" x2="10" y2="11" stroke={color} strokeWidth="2" strokeLinecap="round" />
      {/* Right arm — down */}
      <line x1="20" y1="15" x2="30" y2="19" stroke={color} strokeWidth="2" strokeLinecap="round" />
      {/* Left leg */}
      <line x1="20" y1="25" x2="13" y2="36" stroke={color} strokeWidth="2" strokeLinecap="round" />
      {/* Right leg */}
      <line x1="20" y1="25" x2="27" y2="36" stroke={color} strokeWidth="2" strokeLinecap="round" />
      {/* Sword — diagonal line from raised arm */}
      <line x1="10" y1="11" x2="5" y2="4" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      {/* Sword cross-guard */}
      <line x1="7" y1="9" x2="11" y2="5" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function QueenFigure({ size = 40, color = "currentColor" }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
      style={{ display: "block" }}
    >
      {/* Crown */}
      <polyline points="12,7 14,3 18,6 20,2 22,6 26,3 28,7" stroke={color} strokeWidth="1.8" strokeLinejoin="round" fill="none" />
      <line x1="12" y1="7" x2="28" y2="7" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      {/* Head */}
      <circle cx="20" cy="12" r="4" stroke={color} strokeWidth="2" />
      {/* Body */}
      <line x1="20" y1="16" x2="20" y2="29" stroke={color} strokeWidth="2" strokeLinecap="round" />
      {/* Arms out wide */}
      <line x1="20" y1="20" x2="10" y2="25" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <line x1="20" y1="20" x2="30" y2="25" stroke={color} strokeWidth="2" strokeLinecap="round" />
      {/* Left leg */}
      <line x1="20" y1="29" x2="14" y2="39" stroke={color} strokeWidth="2" strokeLinecap="round" />
      {/* Right leg */}
      <line x1="20" y1="29" x2="26" y2="39" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function KingFigure({ size = 40, color = "currentColor" }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
      style={{ display: "block" }}
    >
      {/* Large crown with orb on top */}
      <polyline points="11,8 13,3 17,6 20,1 23,6 27,3 29,8" stroke={color} strokeWidth="2" strokeLinejoin="round" fill="none" />
      <line x1="11" y1="8" x2="29" y2="8" stroke={color} strokeWidth="2" strokeLinecap="round" />
      {/* Orb dot */}
      <circle cx="20" cy="1" r="1.5" fill={color} />
      {/* Head */}
      <circle cx="20" cy="13" r="4.5" stroke={color} strokeWidth="2.2" />
      {/* Body (slightly thicker for king) */}
      <line x1="20" y1="17.5" x2="20" y2="30" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      {/* Cape / wide shoulders */}
      <path d="M20,20 L9,27 L13,30" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M20,20 L31,27 L27,30" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* Left leg */}
      <line x1="20" y1="30" x2="14" y2="39" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
      {/* Right leg */}
      <line x1="20" y1="30" x2="26" y2="39" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}
