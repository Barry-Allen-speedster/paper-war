"use client";
import { useEffect, useRef, useState } from "react";
import type { Vec2 } from "@lib/game/types";
import { clamp01 } from "@lib/game/geometry";
import { useGameStore } from "@hooks/useGameStore";
import { MagnifierLoupe } from "./MagnifierLoupe";

interface Props {
  halfWidth: number;
  halfHeight: number;
  /** CSS background of the opponent half — for the loupe to mirror */
  opponentBg: string;
}

export function AimingReticle({ halfWidth, halfHeight, opponentBg }: Props) {
  const { gameState, dispatch } = useGameStore();
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const pos = gameState.aimingPos;
  const cx = pos.x * halfWidth;
  const cy = pos.y * halfHeight;

  function posFromPointer(e: PointerEvent | React.PointerEvent): Vec2 {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return pos;
    return clamp01({
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    });
  }

  function handlePointerDown(e: React.PointerEvent) {
    setIsDragging(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dispatch({ type: "AIM", pos: posFromPointer(e) });
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!isDragging) return;
    dispatch({ type: "AIM", pos: posFromPointer(e) });
  }

  function handlePointerUp() {
    setIsDragging(false);
  }

  // Keyboard arrow key movement
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (gameState.phase !== "Aiming") return;
      const step = 1 / 50;
      let { x, y } = gameState.aimingPos;
      if (e.key === "ArrowLeft")  x = Math.max(0, x - step);
      if (e.key === "ArrowRight") x = Math.min(1, x + step);
      if (e.key === "ArrowUp")    y = Math.max(0, y - step);
      if (e.key === "ArrowDown")  y = Math.min(1, y + step);
      if (["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(e.key)) {
        e.preventDefault();
        dispatch({ type: "AIM", pos: { x, y } });
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [gameState.phase, gameState.aimingPos, dispatch]);

  const RETICLE_R = 16;

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pw-no-scroll"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Loupe — shown above finger during drag */}
      {isDragging && (
        <MagnifierLoupe
          targetX={cx}
          targetY={cy}
          halfWidth={halfWidth}
          halfHeight={halfHeight}
          backgroundCss={opponentBg}
        />
      )}

      {/* SVG reticle */}
      <svg
        className="absolute inset-0 pointer-events-none overflow-visible"
        width={halfWidth}
        height={halfHeight}
        aria-hidden="true"
      >
        <circle cx={cx} cy={cy} r={RETICLE_R} fill="none" stroke="var(--pw-accent)" strokeWidth={2} />
        <line x1={cx - RETICLE_R - 4} y1={cy} x2={cx + RETICLE_R + 4} y2={cy} stroke="var(--pw-accent)" strokeWidth={1.5} />
        <line x1={cx} y1={cy - RETICLE_R - 4} x2={cx} y2={cy + RETICLE_R + 4} stroke="var(--pw-accent)" strokeWidth={1.5} />
        <circle cx={cx} cy={cy} r={2} fill="var(--pw-accent)" />
      </svg>
    </div>
  );
}
