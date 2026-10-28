"use client";
import type { Unit } from "@lib/game/types";
import { DEFAULT_CONFIG } from "@lib/game/config";
import { isValidPlacement } from "@lib/game/placement";

interface Props {
  unit: Unit;
  existingUnits: Unit[];
  /** Position in [0,1] normalized coords within the half */
  pos: { x: number; y: number };
  halfWidth: number;
  halfHeight: number;
}

const C = DEFAULT_CONFIG;

export function UnitGhost({ unit, existingUnits, pos, halfWidth, halfHeight }: Props) {
  const candidate = { ...unit, pos };
  const valid = isValidPlacement(candidate, existingUnits).valid;

  const radiusRef = C.HIT_RADIUS[unit.type];
  const radiusPx = (radiusRef / C.REF_SIZE) * Math.min(halfWidth, halfHeight);
  const cx = pos.x * halfWidth;
  const cy = pos.y * halfHeight;

  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        left: cx - radiusPx,
        top: cy - radiusPx,
        width: radiusPx * 2,
        height: radiusPx * 2,
        borderRadius: "50%",
        border: `2px dashed ${valid ? "var(--pw-accent)" : "#ef4444"}`,
        backgroundColor: valid ? "rgba(34,68,204,0.1)" : "rgba(239,68,68,0.15)",
        pointerEvents: "none",
        transition: "border-color 0.1s, background-color 0.1s",
      }}
    />
  );
}
