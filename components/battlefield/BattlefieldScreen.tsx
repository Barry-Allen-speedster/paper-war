"use client";
/**
 * BattlefieldScreen — v0.2 open-information battlefield.
 *
 * Both armies are fully visible at all times.
 * The reticle lives on the PLAYER'S OWN half.
 * A shot at (u,v) folds and lands at (u,v) on the opponent's half.
 * The fold animation is driven by FoldAnimationLayer (Framer Motion).
 */
import { useEffect, useState, useCallback, useRef } from "react";
import { useGameStore } from "@hooks/useGameStore";
import { useTheme } from "@hooks/useTheme";
import { useResizeObserver } from "@hooks/useResizeObserver";
import { computeShotResult, buildShot } from "@lib/game/rules";
import { t } from "@lib/i18n";
import { DEFAULT_CONFIG } from "@lib/game/config";
import { createRNG } from "@lib/game/rng";
import { Button } from "@components/ui/Button";
import { CenterCrease } from "./CenterCrease";
import { UnitMarker } from "./UnitMarker";
import { ShotMark } from "./ShotMark";
import { AimingReticle } from "./AimingReticle";
import { FoldAnimationLayer } from "./FoldAnimationLayer";
import { ShotLogDrawer } from "./ShotLogDrawer";
import { getAudioService } from "@lib/audio/audioService";
import { useSettingsStore } from "@hooks/useSettingsStore";
import { useNetStore } from "@hooks/useNetStore";
import type { Shot } from "@lib/game/types";

const C = DEFAULT_CONFIG;

interface Props {
  viewingPlayerId: "p1" | "p2";
}

export function BattlefieldScreen({ viewingPlayerId }: Props) {
  const { gameState, dispatch } = useGameStore();
  const theme = useTheme();
  const soundEnabled = useSettingsStore((s) => s.soundEnabled);
  const transport = useNetStore((s) => s.transport);
  const [boardRef, boardSize] = useResizeObserver<HTMLDivElement>();

  // Refs for fold animation — one per half
  const p1HalfRef = useRef<HTMLDivElement | null>(null);
  const p2HalfRef = useRef<HTMLDivElement | null>(null);
  const boardDivRef = useRef<HTMLDivElement | null>(null);

  const [foldTrigger, setFoldTrigger] = useState(false);
  const [resolvedShot, setResolvedShot] = useState<Shot | null>(null);
  const [resultVisible, setResultVisible] = useState(false);
  const resultTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { phase, players, currentPlayerId, turn, shotsRemainingInTurn, config, aimingPos } = gameState;

  const isPortrait = boardSize.width > 0 && boardSize.height > boardSize.width;
  // Guard: treat as landscape (default) until ResizeObserver fires on client
  const halfW = boardSize.width > 0
    ? (isPortrait ? boardSize.width : boardSize.width / 2)
    : 0;
  const halfH = boardSize.height > 0
    ? (isPortrait ? boardSize.height / 2 : boardSize.height)
    : 0;

  const p1 = players[0]!;
  const p2 = players[1]!;

  // The ATTACKER's half is the currentPlayer's half
  // P1 is always on the left (landscape) / top (portrait)
  // P2 is always on the right (landscape) / bottom (portrait)
  const attackerIsP1 = currentPlayerId === "p1";
  const attackerHalfRef = attackerIsP1 ? p1HalfRef : p2HalfRef;

  // Fold side: the attacker folds TOWARD the crease
  // P1 is left → pivot is the right edge → side = "left"
  // P2 is right → pivot is the left edge → side = "right"
  // In portrait: P1 is top → pivot is the bottom edge → side = "top"
  //              P2 is bottom → pivot is the top edge → side = "bottom"
  const foldSide = isPortrait
    ? (attackerIsP1 ? "top" : "bottom")
    : (attackerIsP1 ? "left" : "right");

  const isMyTurn  = currentPlayerId === viewingPlayerId;
  const isAiming  = phase === "Aiming" && isMyTurn;
  const isAnimating = foldTrigger;

  // Seeded jitter for fold rumble — no Math.random()
  const jitterRng = createRNG(config.seed + turn * 997);
  const jitter = {
    rx: (jitterRng.next() - 0.5) * 2,
    ry: (jitterRng.next() - 0.5) * 2,
    rr: (jitterRng.next() - 0.5) * 2,
  };

  const heavyHit = resolvedShot
    ? resolvedShot.killedUnitType === "king"   ? 1.0
    : resolvedShot.killedUnitType === "queen"  ? 0.6
    : resolvedShot.result === "hit"            ? 0.3
    : 0.0
    : 0.0;

  // ── Phase transition: Fired → start fold ─────────────────────────────────
  useEffect(() => {
    if (phase !== "Fired") return;
    dispatch({ type: "ANIMATION_FOLDING_START" });
    setFoldTrigger(true);
  }, [phase, dispatch]);

  // ── After fold completes: resolve the shot, show result ──────────────────
  function handleFoldComplete() {
    setFoldTrigger(false);

    dispatch({ type: "ANIMATION_FOLDING_COMPLETE" });
    dispatch({ type: "ANIMATION_PRESSING_COMPLETE" });
    dispatch({ type: "ANIMATION_UNFOLDING_COMPLETE" });

    // Physics of folding: the X axis MIRRORS when the paper folds over the crease.
    // A shot placed at (u, v) on the attacker's half lands at (1-u, v) on the
    // opponent's half. Y is unchanged (up/down stays the same).
    // In portrait mode the crease is horizontal so Y mirrors and X stays:
    // (u, v) → (u, 1-v). We detect orientation from the board size.
    const defenderIdx = currentPlayerId === "p1" ? 1 : 0;
    const defender = players[defenderIdx]!;
    const raw = aimingPos;
    const mirroredPos = isPortrait
      ? { x: raw.x, y: 1 - raw.y }   // portrait: crease is horizontal, Y mirrors
      : { x: 1 - raw.x, y: raw.y };  // landscape: crease is vertical, X mirrors

    const computed = computeShotResult(mirroredPos, defender, config.rules);
    const shot = buildShot(mirroredPos, currentPlayerId, turn, computed);

    setResolvedShot(shot);
    setResultVisible(true);

    // ── Audio ──────────────────────────────────────────────────────────────
    const audio = getAudioService();
    audio.init();
    audio.setMuted(!soundEnabled);
    audio.play("press"); // paper thud
    setTimeout(() => {
      if (shot.result === "kill") audio.play("kill");
      else if (shot.result === "hit") audio.play("hit");
      else if (shot.result === "miss") audio.play("miss");
    }, 80);

    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(shot.result === "miss" ? [25] : [60, 20, 60]);
    }

    // Dispatch resolve + schedule END_TURN after result flash
    dispatch({ type: "RESOLVE_SHOT", shot });

    if (resultTimerRef.current) clearTimeout(resultTimerRef.current);
    resultTimerRef.current = setTimeout(() => {
      setResultVisible(false);
      dispatch({ type: "END_TURN" });
    }, 1200);
  }

  // ── Skip: cancel fold timer, resolve immediately ─────────────────────────
  function handleSkip() {
    if (!isAnimating) return;
    setFoldTrigger(false);
    handleFoldComplete();
  }

  // ── Combine boardRef callback with boardDivRef ────────────────────────────
  const combinedBoardRef = useCallback((el: HTMLDivElement | null) => {
    boardRef(el);
    boardDivRef.current = el;
  }, [boardRef]);

  function handleFire() {
    if (!isAiming) return;
    if (config.mode === "online") {
      transport?.send({
        type: "shot",
        pos: aimingPos,
        shotId: `${currentPlayerId}-${turn}-${p1.shots.length + p2.shots.length}`,
        seq: 0,
      });
    }
    // Init audio and play fire sound on first gesture
    const audio = getAudioService();
    audio.init();
    audio.setMuted(!soundEnabled);
    audio.play("fire");
    dispatch({ type: "FIRE" });
  }

  const playerLabel = (id: "p1" | "p2") =>
    config.mode === "ai" && id === "p2"
      ? t("shared.ai")
      : id === "p1" ? t("shared.player1") : t("shared.player2");

  const allShots = [...p1.shots, ...p2.shots];

  // Result banner text
  const resultText = resolvedShot
    ? resolvedShot.result === "kill"  ? `💥 ${resolvedShot.killedUnitType} destroyed!`
    : resolvedShot.result === "hit"   ? "💥 Hit!"
    : resolvedShot.result === "waste" ? "♻ Wasted ink"
    : "● Miss"
    : "";

  const skippedNotice = gameState.skippedTurnPlayerId !== null
    ? `⏭ ${playerLabel(gameState.skippedTurnPlayerId)}'s turn skipped!`
    : null;

  return (
    <div className="flex flex-col h-screen bg-[var(--pw-bg)]" style={{ userSelect: "none" }} suppressHydrationWarning>

      {/* ── Turn banner ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--pw-border)] bg-[var(--pw-surface)]">
        <span className="text-sm font-semibold">
          {playerLabel(currentPlayerId)}&apos;s Turn
        </span>
        <span className="text-xs text-[var(--pw-text-muted)]">
          {config.rules.shotsPerTurn > 1
            ? `Shot ${config.rules.shotsPerTurn - shotsRemainingInTurn + 1}/${config.rules.shotsPerTurn}`
            : `Turn ${turn}`}
        </span>
        <span className="text-xs flex gap-1">
          {config.rules.queenTakesTwo && <span title="Queen takes 2 hits">♛×2</span>}
          {config.rules.kingTakesFour && <span title="King takes 4 hits">♔×4</span>}
          {config.rules.allUnitsWin && <span title="Must destroy all units">☠</span>}
          {config.rules.queenKillSkipsTurn && <span title="Queen kill skips turn">⏭</span>}
          {config.rules.streakRevive && <span title="3 soldier streak = revive">🎖</span>}
        </span>
      </div>

      {/* ── Board ────────────────────────────────────────────────────────── */}
      <div
        ref={combinedBoardRef}
        className={[
          "flex-1 relative overflow-hidden",
          isPortrait ? "flex flex-col" : "flex flex-row",
        ].join(" ")}
        onClick={isAnimating ? handleSkip : undefined}
        aria-label="Battlefield"
        suppressHydrationWarning
        style={{ perspective: "1200px" }}
      >
        {/* ── P1 half (always left/top) ────────────────────────────────── */}
        <div
          ref={p1HalfRef}
          className="relative overflow-hidden flex-1"
          style={{
            background: theme.backgroundCss,
            transformStyle: "preserve-3d",
          }}
        >
          {halfW > 0 && halfH > 0 && (
            <svg
              className="absolute inset-0"
              width={halfW}
              height={halfH}
              style={{ overflow: "visible" }}
              aria-label="Player 1 army"
            >
              {players[0]!.units.map((u) => (
                <UnitMarker key={u.id} unit={u} halfWidth={halfW} halfHeight={halfH} />
              ))}
              {players[1]!.shots.map((s) => (
                <ShotMark key={s.id} shot={s} halfWidth={halfW} halfHeight={halfH} />
              ))}
            </svg>
          )}

          {/* Reticle on P1's half when P1 is aiming */}
          {isAiming && currentPlayerId === "p1" && halfW > 0 && halfH > 0 && (
            <AimingReticle
              halfWidth={halfW}
              halfHeight={halfH}
              opponentBg={theme.backgroundCss}
            />
          )}

          <div className="absolute top-1 left-2 text-xs opacity-50 pointer-events-none select-none" style={{ color: "var(--pw-text-muted)" }}>
            {playerLabel("p1")}
          </div>
        </div>

        {/* ── Crease ───────────────────────────────────────────────────── */}
        <CenterCrease orientation={isPortrait ? "horizontal" : "vertical"} />

        {/* ── P2 half (always right/bottom) ────────────────────────────── */}
        <div
          ref={p2HalfRef}
          className="relative overflow-hidden flex-1"
          style={{ background: theme.backgroundCss, transformStyle: "preserve-3d" }}
        >
          {halfW > 0 && halfH > 0 && (
            <svg
              className="absolute inset-0"
              width={halfW}
              height={halfH}
              style={{ overflow: "visible" }}
              aria-label="Player 2 army"
            >
              {players[1]!.units.map((u) => (
                <UnitMarker key={u.id} unit={u} halfWidth={halfW} halfHeight={halfH} />
              ))}
              {players[0]!.shots.map((s) => (
                <ShotMark key={s.id} shot={s} halfWidth={halfW} halfHeight={halfH} />
              ))}
            </svg>
          )}

          {/* King quadrant highlight */}
          {gameState.revealedKingQuadrant !== null && currentPlayerId === "p1" && (
            <div
              aria-label="King's quadrant"
              style={{
                position: "absolute",
                left:   gameState.revealedKingQuadrant % 2 === 0 ? 0 : "50%",
                top:    gameState.revealedKingQuadrant < 2       ? 0 : "50%",
                width:  "50%",
                height: "50%",
                background: "rgba(255,200,0,0.15)",
                border: "2px dashed rgba(255,200,0,0.5)",
                pointerEvents: "none",
              }}
            />
          )}

          {/* Reticle on P2's half when P2 is aiming */}
          {isAiming && currentPlayerId === "p2" && halfW > 0 && halfH > 0 && (
            <AimingReticle
              halfWidth={halfW}
              halfHeight={halfH}
              opponentBg={theme.backgroundCss}
            />
          )}

          <div className="absolute top-1 right-2 text-xs opacity-50 pointer-events-none select-none" style={{ color: "var(--pw-text-muted)" }}>
            {playerLabel("p2")}
          </div>
        </div>

        {/* ── Fold animation ───────────────────────────────────────────── */}
        <FoldAnimationLayer
          trigger={foldTrigger}
          heavyHit={heavyHit}
          onComplete={handleFoldComplete}
          side={foldSide}
          halfRef={attackerHalfRef}
          boardRef={boardDivRef}
          jitter={jitter}
        />

        {/* ── Fold overlay hint ────────────────────────────────────────── */}
        {isAnimating && (
          <div className="absolute inset-0 pointer-events-none flex items-end justify-center pb-4 z-30" aria-hidden="true">
            <div className="bg-black/40 text-white text-xs px-4 py-1.5 rounded-full backdrop-blur-sm">
              📄 Folding… tap to skip
            </div>
          </div>
        )}

        {/* ── Result flash ─────────────────────────────────────────────── */}
        {resultVisible && resolvedShot && (
          <div
            className="absolute inset-x-0 top-6 flex flex-col items-center gap-2 pointer-events-none z-30"
            aria-live="assertive"
          >
            <div
              className={[
                "px-5 py-2 rounded-full text-sm font-bold shadow-lg animate-fade-in",
                (resolvedShot.result === "hit" || resolvedShot.result === "kill")
                  ? "bg-[var(--pw-hit)] text-white"
                  : "bg-[var(--pw-surface)] text-[var(--pw-text-muted)] border border-[var(--pw-border)]",
              ].join(" ")}
            >
              {resultText}
            </div>
            {skippedNotice && (
              <div className="px-4 py-1.5 rounded-full text-xs font-bold bg-yellow-500 text-white shadow-lg animate-fade-in">
                {skippedNotice}
              </div>
            )}
          </div>
        )}

        {/* ── Revival picker (streakRevive rule) ───────────────────────── */}
        {gameState.pendingRevivePlayerId === viewingPlayerId && (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60">
            <div className="bg-[var(--pw-surface)] rounded-2xl p-6 max-w-sm mx-4 shadow-2xl">
              <p className="text-lg font-bold mb-1">🎖 Revival!</p>
              <p className="text-sm text-[var(--pw-text-muted)] mb-4">
                3 soldiers eliminated in a row! Choose one of your fallen soldiers to revive.
              </p>
              <div className="flex flex-wrap gap-2">
                {players[viewingPlayerId === "p1" ? 0 : 1]!.units
                  .filter((u) => u.type === "soldier" && !u.alive)
                  .map((u) => (
                    <button
                      key={u.id}
                      onClick={() => dispatch({ type: "REVIVE_SOLDIER", playerId: viewingPlayerId, unitId: u.id })}
                      className="px-4 py-2 rounded-lg bg-[var(--pw-accent)] text-white font-semibold text-sm hover:opacity-90"
                    >
                      Revive Soldier
                    </button>
                  ))}
                {players[viewingPlayerId === "p1" ? 0 : 1]!.units
                  .filter((u) => u.type === "soldier" && !u.alive).length === 0 && (
                  <p className="text-sm text-[var(--pw-text-muted)]">No fallen soldiers to revive.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── ARIA live ────────────────────────────────────────────────────── */}
      <div role="status" aria-live="assertive" aria-atomic="true" className="sr-only">
        {resultVisible ? resultText : ""}
      </div>

      {/* ── Action bar ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-center gap-4 px-4 py-3 border-t border-[var(--pw-border)] bg-[var(--pw-surface)]">
        {isAiming && (
          <Button onClick={handleFire} className="px-8 py-3 text-base">
            🎯 {t("battle.fire")}
          </Button>
        )}

        {isAnimating && (
          <Button variant="ghost" onClick={handleSkip} className="text-sm">
            {t("shared.skip")}
          </Button>
        )}

        {!isMyTurn && phase === "Aiming" && config.mode !== "ai" && (
          <p className="text-[var(--pw-text-muted)] text-sm">{t("battle.waiting")}</p>
        )}

        {!isMyTurn && config.mode === "ai" && phase === "Aiming" && (
          <p className="text-[var(--pw-text-muted)] text-sm animate-pulse">{t("battle.ai.thinking")}</p>
        )}
      </div>
    </div>
  );
}
