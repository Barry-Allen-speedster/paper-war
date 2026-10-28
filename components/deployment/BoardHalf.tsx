"use client";
import { useRef, useState, useCallback } from "react";
import type { Unit, Vec2 } from "@lib/game/types";
import { DEFAULT_CONFIG } from "@lib/game/config";
import { isValidPlacement } from "@lib/game/placement";
import { clamp01 } from "@lib/game/geometry";
import { UnitGhost } from "./UnitGhost";
import { useResizeObserver } from "@hooks/useResizeObserver";

interface Props {
  units: Unit[];
  selectedUnitId: string | null;
  backgroundCss: string;
  onPlace: (unitId: string, pos: Vec2) => void;
  onDragEnd: (unitId: string, pos: Vec2) => void;
}

const C = DEFAULT_CONFIG;

export function BoardHalf({ units, selectedUnitId, backgroundCss, onPlace, onDragEnd }: Props) {
  const [containerRef, size] = useResizeObserver<HTMLDivElement>();
  const [ghostPos, setGhostPos] = useState<Vec2 | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragStartRef = useRef<Vec2 | null>(null);

  const getRelativePos = useCallback((e: React.PointerEvent): Vec2 => {
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    return clamp01({
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    });
  }, []);

  function handlePointerDown(e: React.PointerEvent) {
    const pos = getRelativePos(e);

    // Check if clicking on an already-placed unit to start drag
    const clicked = units.find((u) => {
      const radiusNorm = C.HIT_RADIUS[u.type] / C.REF_SIZE;
      const dx = u.pos.x - pos.x;
      const dy = u.pos.y - pos.y;
      return Math.sqrt(dx * dx + dy * dy) < radiusNorm * 1.5;
    });

    if (clicked) {
      setDraggingId(clicked.id);
      dragStartRef.current = pos;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      return;
    }

    // Tap-to-place: if a unit is selected in the tray
    if (selectedUnitId) {
      const unit = units.find((u) => u.id === selectedUnitId);
      if (!unit) return;
      const candidate = { ...unit, pos };
      const others = units.filter((u) => u.id !== selectedUnitId);
      if (isValidPlacement(candidate, others).valid) {
        onPlace(selectedUnitId, pos);
      } else {
        setGhostPos(pos);
        setTimeout(() => setGhostPos(null), 600);
      }
    }
  }

  function handlePointerMove(e: React.PointerEvent) {
    const pos = getRelativePos(e);
    if (draggingId || selectedUnitId) {
      setGhostPos(pos);
    }
  }

  function handlePointerUp(e: React.PointerEvent) {
    const pos = getRelativePos(e);
    if (draggingId) {
      onDragEnd(draggingId, pos);
      setDraggingId(null);
      setGhostPos(null);
    }
  }

  const selectedUnit = units.find((u) => u.id === selectedUnitId) ?? null;
  const draggingUnit = units.find((u) => u.id === draggingId) ?? null;
  const ghostUnit = draggingUnit ?? selectedUnit;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full pw-no-scroll cursor-crosshair"
      style={{ background: backgroundCss }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Placed units */}
      {units.map((unit) => {
        const radiusRef = C.HIT_RADIUS[unit.type];
        const radiusPx = (radiusRef / C.REF_SIZE) * Math.min(size.width, size.height);
        const cx = unit.pos.x * size.width;
        const cy = unit.pos.y * size.height;
        const unitEmoji = ({ soldier: "🗡", queen: "♛", king: "♔" } as const)[unit.type];
        const isDragging = unit.id === draggingId;

        return (
          <div
            key={unit.id}
            aria-label={unit.type}
            style={{
              position: "absolute",
              left: cx - radiusPx,
              top: cy - radiusPx,
              width: radiusPx * 2,
              height: radiusPx * 2,
              borderRadius: "50%",
              border: "2px solid var(--pw-accent)",
              backgroundColor: "var(--pw-surface)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: radiusPx * 0.9,
              opacity: isDragging ? 0.4 : 1,
              transition: "opacity 0.1s",
              cursor: "grab",
              userSelect: "none",
            }}
          >
            {unitEmoji}
          </div>
        );
      })}

      {/* Ghost preview */}
      {ghostPos && ghostUnit && (
        <UnitGhost
          unit={ghostUnit}
          existingUnits={units.filter((u) => u.id !== ghostUnit.id)}
          pos={ghostPos}
          halfWidth={size.width}
          halfHeight={size.height}
        />
      )}
    </div>
  );
}
