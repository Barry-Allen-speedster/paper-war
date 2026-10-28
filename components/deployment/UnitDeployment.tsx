"use client";
import { useState } from "react";
import type { PlayerId, Vec2, UnitType } from "@lib/game/types";
import { useGameStore } from "@hooks/useGameStore";
import { useTheme } from "@hooks/useTheme";
import { DEFAULT_CONFIG } from "@lib/game/config";
import { Button } from "@components/ui/Button";
import { t } from "@lib/i18n";
import { SoldierFigure, QueenFigure, KingFigure } from "@components/units/StickFigure";
import { useResizeObserver } from "@hooks/useResizeObserver";
import { clamp01 } from "@lib/game/geometry";
import { isValidPlacement } from "@lib/game/placement";

const C = DEFAULT_CONFIG;

interface Props {
  playerId: PlayerId;
  onReady: () => void;
}

const FIGURE_MAP = {
  soldier: SoldierFigure,
  queen: QueenFigure,
  king: KingFigure,
} satisfies Record<UnitType, React.ComponentType<{ size?: number; color?: string }>>;

const UNIT_LABELS: Record<UnitType, string> = {
  soldier: "Soldier",
  queen: "Queen",
  king: "King",
};

export function UnitDeployment({ playerId, onReady }: Props) {
  const { gameState, dispatch } = useGameStore();
  const theme = useTheme();
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [boardRef, boardSize] = useResizeObserver<HTMLDivElement>();
  const [ghostPos, setGhostPos] = useState<{ x: number; y: number } | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const playerIdx = playerId === "p1" ? 0 : 1;
  const player = gameState.players[playerIdx]!;
  const units = player.units;

  // A unit is "placed" if it has been moved from its initial (0,0) sentinel position.
  // isValidPlacement rejects (0,0) due to edge margins so this is a reliable sentinel.
  const isPlaced = (u: { pos: Vec2 }) => !(u.pos.x === 0 && u.pos.y === 0);
  const unplacedUnits = units.filter((u) => !isPlaced(u));
  const placedUnits   = units.filter((u) =>  isPlaced(u));
  const allPlaced     = unplacedUnits.length === 0;

  // Validate that ALL placed units form a legal army (no overlaps, in bounds)
  // Only check placed units — unplaced ones are always at (0,0) which fails validation
  const armyValid = allPlaced && placedUnits.every((u) => {
    const others = placedUnits.filter((o) => o.id !== u.id);
    return isValidPlacement(u, others).valid;
  });

  // ── Pointer interaction ─────────────────────────────────────────────────────

  function getRelativePos(e: React.PointerEvent): Vec2 {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    return clamp01({
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    });
  }

  function handleBoardPointerDown(e: React.PointerEvent) {
    const pos = getRelativePos(e);

    // Check if clicking a placed unit to drag it
    const hit = placedUnits.find((u) => {
      const r = (C.HIT_RADIUS[u.type] / C.REF_SIZE) * 1.5;
      return Math.hypot(u.pos.x - pos.x, u.pos.y - pos.y) < r;
    });

    if (hit) {
      setDraggingId(hit.id);
      setGhostPos(pos);
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      return;
    }

    // Tap-to-place the selected tray unit
    if (selectedUnitId) {
      const unit = units.find((u) => u.id === selectedUnitId);
      if (!unit) return;
      const candidate = { ...unit, pos };
      const others = placedUnits.filter((u) => u.id !== selectedUnitId);
      if (isValidPlacement(candidate, others).valid) {
        dispatch({ type: "PLACE_UNIT", playerId, unitId: selectedUnitId, pos });
        setSelectedUnitId(null);
      } else {
        // Flash ghost red briefly to show invalid
        setGhostPos(pos);
        setTimeout(() => setGhostPos(null), 600);
      }
    }
  }

  function handleBoardPointerMove(e: React.PointerEvent) {
    const pos = getRelativePos(e);
    if (draggingId || selectedUnitId) setGhostPos(pos);
  }

  function handleBoardPointerUp(e: React.PointerEvent) {
    const pos = getRelativePos(e);
    if (draggingId) {
      dispatch({ type: "PLACE_UNIT", playerId, unitId: draggingId, pos });
      setDraggingId(null);
      setGhostPos(null);
    }
  }

  // ── Actions ────────────────────────────────────────────────────────────────

  function handleRandomize() {
    dispatch({ type: "RANDOMIZE_PLACEMENT", playerId });
    setSelectedUnitId(null);
    setGhostPos(null);
  }

  function handleReset() {
    dispatch({ type: "RESET_PLACEMENT", playerId });
    setSelectedUnitId(null);
    setGhostPos(null);
  }

  function handleReady() {
    if (!armyValid) return;
    dispatch({ type: "LOCK_LAYOUT", playerId });
    onReady();
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  function unitColor(type: UnitType): string {
    if (type === "king") return "var(--pw-accent)";
    if (type === "queen") return "var(--pw-text)";
    return "var(--pw-text-muted)";
  }

  const ghostUnit = draggingId
    ? units.find((u) => u.id === draggingId) ?? null
    : selectedUnitId
    ? units.find((u) => u.id === selectedUnitId) ?? null
    : null;

  const ghostValid = ghostPos && ghostUnit
    ? isValidPlacement(
        { ...ghostUnit, pos: ghostPos },
        placedUnits.filter((u) => u.id !== (draggingId ?? selectedUnitId))
      ).valid
    : true;

  const playerLabel = playerId === "p1" ? t("shared.player1") : t("shared.player2");

  return (
    <div className="flex flex-col h-screen bg-[var(--pw-bg)] select-none">
      {/* Header */}
      <div className="p-3 text-center border-b border-[var(--pw-border)] bg-[var(--pw-surface)]">
        <h2 className="text-lg font-bold">
          {playerLabel} — {t("deploy.title")}
        </h2>
        <p className="text-xs text-[var(--pw-text-muted)] mt-0.5">
          Tap a unit below, then tap the paper to place it
        </p>
      </div>

      {/* Paper / Board area */}
      <div className="flex-1 flex items-center justify-center p-3 min-h-0">
        <div
          ref={boardRef}
          className="relative w-full max-w-md pw-no-scroll cursor-crosshair rounded-lg overflow-hidden border-2 border-[var(--pw-border)] shadow-lg"
          style={{
            background: theme.backgroundCss,
            aspectRatio: "1",
            maxHeight: "100%",
          }}
          onPointerDown={handleBoardPointerDown}
          onPointerMove={handleBoardPointerMove}
          onPointerUp={handleBoardPointerUp}
        >
          {/* Placed units */}
          {placedUnits.map((unit) => {
            const r = (C.HIT_RADIUS[unit.type] / C.REF_SIZE) * Math.min(boardSize.width, boardSize.height);
            const cx = unit.pos.x * boardSize.width;
            const cy = unit.pos.y * boardSize.height;
            const Figure = FIGURE_MAP[unit.type];
            const dimmed = draggingId === unit.id;

            return (
              <div
                key={unit.id}
                style={{
                  position: "absolute",
                  left: cx - r,
                  top:  cy - r,
                  width: r * 2,
                  height: r * 2,
                  borderRadius: "50%",
                  border: `2px solid ${unitColor(unit.type)}`,
                  backgroundColor: "var(--pw-surface)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: dimmed ? 0.35 : 1,
                  cursor: "grab",
                  boxSizing: "border-box",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.18)",
                }}
                aria-label={UNIT_LABELS[unit.type]}
              >
                <Figure size={r * 1.5} color={unitColor(unit.type)} />
              </div>
            );
          })}

          {/* Ghost preview */}
          {ghostPos && ghostUnit && (() => {
            const r = (C.HIT_RADIUS[ghostUnit.type] / C.REF_SIZE) * Math.min(boardSize.width, boardSize.height);
            const cx = ghostPos.x * boardSize.width;
            const cy = ghostPos.y * boardSize.height;
            const Figure = FIGURE_MAP[ghostUnit.type];
            const color = ghostValid ? "var(--pw-accent)" : "#ef4444";

            return (
              <div
                aria-hidden="true"
                style={{
                  position: "absolute",
                  left: cx - r,
                  top:  cy - r,
                  width: r * 2,
                  height: r * 2,
                  borderRadius: "50%",
                  border: `2px dashed ${color}`,
                  backgroundColor: ghostValid ? "rgba(34,68,204,0.08)" : "rgba(239,68,68,0.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  pointerEvents: "none",
                  opacity: 0.85,
                }}
              >
                <Figure size={r * 1.5} color={color} />
              </div>
            );
          })()}

          {/* Crease hint line at bottom */}
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: 3,
              background: "var(--pw-crease)",
              opacity: 0.7,
            }}
          />

          {/* Instruction when board empty */}
          {placedUnits.length === 0 && !ghostPos && (
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                pointerEvents: "none",
              }}
            >
              <p style={{ color: "var(--pw-text-muted)", fontSize: 13, textAlign: "center", padding: "0 20px" }}>
                Select a unit below, then tap here to place it
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Unit tray */}
      <div className="px-3 py-2 border-t border-[var(--pw-border)] bg-[var(--pw-surface)]">
        <p className="text-xs text-[var(--pw-text-muted)] text-center mb-2">
          {allPlaced ? "All units placed! ✓" : `${unplacedUnits.length} unit${unplacedUnits.length !== 1 ? "s" : ""} left to place`}
        </p>
        <div className="flex flex-wrap gap-2 justify-center">
          {unplacedUnits.map((unit) => {
            const Figure = FIGURE_MAP[unit.type];
            const isSelected = selectedUnitId === unit.id;
            return (
              <button
                key={unit.id}
                onClick={() => setSelectedUnitId((prev) => (prev === unit.id ? null : unit.id))}
                aria-label={`${UNIT_LABELS[unit.type]} — tap to select`}
                aria-pressed={isSelected}
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 10,
                  border: `2px solid ${isSelected ? "var(--pw-accent)" : "var(--pw-border)"}`,
                  background: isSelected ? "var(--pw-accent)" + "22" : "var(--pw-surface)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  transition: "all 0.12s",
                  transform: isSelected ? "scale(1.12)" : "scale(1)",
                  gap: 2,
                }}
              >
                <Figure size={30} color={isSelected ? "var(--pw-accent)" : unitColor(unit.type)} />
                <span style={{ fontSize: 9, color: isSelected ? "var(--pw-accent)" : "var(--pw-text-muted)", lineHeight: 1 }}>
                  {UNIT_LABELS[unit.type]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="px-3 py-3 flex gap-2 justify-between border-t border-[var(--pw-border)] bg-[var(--pw-surface)]">
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleReset} className="text-sm px-3">
            {t("deploy.reset")}
          </Button>
          <Button variant="secondary" onClick={handleRandomize} className="text-sm px-3">
            {t("deploy.randomize")}
          </Button>
        </div>
        <Button
          onClick={handleReady}
          disabled={!armyValid}
          className="text-sm px-4"
        >
          {allPlaced ? t("deploy.ready") : `Place ${unplacedUnits.length} more`}
        </Button>
      </div>
    </div>
  );
}
