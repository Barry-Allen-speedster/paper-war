"use client";
import type { Unit } from "@lib/game/types";
import { DEFAULT_CONFIG } from "@lib/game/config";
import { SoldierFigure, BomberFigure, QueenFigure, KingFigure } from "@components/units/StickFigure";

interface Props {
  unit: Unit;
  halfWidth: number;
  halfHeight: number;
  revealed?: boolean;
}

const C = DEFAULT_CONFIG;

const FIGURES = {
  soldier: SoldierFigure,
  bomber: BomberFigure,
  queen:   QueenFigure,
  king:    KingFigure,
} as const;

const UNIT_COLORS = {
  soldier: "var(--pw-text-muted)",
  bomber: "#d97706",
  queen:   "var(--pw-text)",
  king:    "var(--pw-accent)",
} as const;

export function UnitMarker({ unit, halfWidth, halfHeight, revealed }: Props) {
  const radiusRef = C.HIT_RADIUS[unit.type];
  const scale = Math.min(halfWidth, halfHeight) / C.REF_SIZE;
  const r = radiusRef * scale;
  const cx = unit.pos.x * halfWidth;
  const cy = unit.pos.y * halfHeight;

  const isDead = !unit.alive;
  const isWounded = unit.alive && unit.hitsRemaining < (unit.type === "queen" ? 2 : 1);
  const Figure = FIGURES[unit.type];
  const color = isDead ? "var(--pw-hit)" : isWounded ? "#f59e0b" : UNIT_COLORS[unit.type];

  return (
    <g
      role="img"
      aria-label={`${isDead ? "Dead " : ""}${unit.type}`}
      transform={`translate(${cx},${cy})`}
    >
      {unit.type === "bomber" && unit.alive && (
        <circle
          r={C.BOMBER_BLAST_RADIUS * scale}
          fill="rgba(217,119,6,0.035)"
          stroke="#d97706"
          strokeWidth={1}
          strokeDasharray="4 4"
          opacity={0.5}
          aria-hidden="true"
        />
      )}
      {/* Circle background */}
      <circle
        r={r}
        fill={isDead ? "rgba(200,0,0,0.08)" : isWounded ? "rgba(245,158,11,0.12)" : "var(--pw-surface)"}
        stroke={isDead ? "var(--pw-hit)" : isWounded ? "#f59e0b" : UNIT_COLORS[unit.type]}
        strokeWidth={isDead ? 1.5 : isWounded ? 2.5 : 2}
        strokeDasharray={isWounded ? "4 2" : undefined}
        opacity={isDead ? 0.65 : 1}
      />

      {/* Stick figure (using foreignObject so the React SVG components render inside SVG) */}
      <foreignObject
        x={-r}
        y={-r}
        width={r * 2}
        height={r * 2}
        style={{ overflow: "visible" }}
      >
        <div
          style={{
            width: r * 2,
            height: r * 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: isDead ? 0.5 : 1,
          }}
        >
          <Figure size={r * 1.4} color={color} />
        </div>
      </foreignObject>

      {/* Dead cross overlay */}
      {isDead && (
        <>
          <line
            x1={-r * 0.45} y1={-r * 0.45}
            x2={ r * 0.45} y2={ r * 0.45}
            stroke="var(--pw-hit)"
            strokeWidth={2.5}
            strokeLinecap="round"
          />
          <line
            x1={ r * 0.45} y1={-r * 0.45}
            x2={-r * 0.45} y2={ r * 0.45}
            stroke="var(--pw-hit)"
            strokeWidth={2.5}
            strokeLinecap="round"
          />
        </>
      )}
    </g>
  );
}
