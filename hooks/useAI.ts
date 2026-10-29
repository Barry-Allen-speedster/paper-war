"use client";
/**
 * AI hook — selects the right strategy, applies think delay, then fires.
 * The AI aims on its own half and goes through the same FIRE flow as a human.
 */
import { useEffect, useRef, useState } from "react";
import { useGameStore } from "./useGameStore";
import { EasyAI } from "@lib/ai/easy";
import { MediumAI } from "@lib/ai/medium";
import { HardAI } from "@lib/ai/hard";
import type { AIStrategy, AIView } from "@lib/ai/types";
import { createRNG } from "@lib/game/rng";
import { DEFAULT_CONFIG } from "@lib/game/config";
import { isBomberPowerShot } from "@lib/game/rules";

const C = DEFAULT_CONFIG;

function makeStrategy(difficulty: string): AIStrategy {
  if (difficulty === "easy") return new EasyAI();
  if (difficulty === "hard") return new HardAI();
  return new MediumAI();
}

export function useAI(): void {
  const { gameState, dispatch } = useGameStore();
  const [isPortrait, setIsPortrait] = useState(false);
  const strategyRef = useRef<AIStrategy | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { phase, config, currentPlayerId, players, turn, pendingRevivePlayerId } = gameState;

  useEffect(() => {
    const updateOrientation = () => setIsPortrait(window.innerHeight > window.innerWidth);
    updateOrientation();
    window.addEventListener("resize", updateOrientation);
    return () => window.removeEventListener("resize", updateOrientation);
  }, []);

  useEffect(() => {
    if (config.mode !== "ai" || pendingRevivePlayerId !== "p2") return;
    const fallenSoldier = players[1]!.units.find((unit) => unit.type === "soldier" && !unit.alive);
    if (fallenSoldier) {
      dispatch({ type: "REVIVE_SOLDIER", playerId: "p2", unitId: fallenSoldier.id });
    }
  }, [config.mode, pendingRevivePlayerId, players, dispatch]);

  const isAITurn =
    config.mode === "ai" &&
    phase === "Aiming" &&
    currentPlayerId === "p2";

  useEffect(() => {
    if (!isAITurn) return;

    if (!strategyRef.current && config.difficulty) {
      strategyRef.current = makeStrategy(config.difficulty);
    }
    const strategy = strategyRef.current;
    if (!strategy) return;

    // p2 is the AI — it shoots at p1's units
    const aiPlayer = players[1]!;   // AI's own player (for shot history)
    const enemyPlayer = players[0]!; // The human player

    const rng = createRNG(config.seed + turn * 1337);

    const view: AIView = {
      visibleEnemyUnits: enemyPlayer.units.filter((u) => u.alive),
      allEnemyUnits: enemyPlayer.units,
      shotHistory: aiPlayer.shots,
      config,
      bomberPowerShot: isBomberPowerShot(config.seed, "p2", aiPlayer.shots.length, aiPlayer, config.rules.bomberEnabled),
      isPortrait,
      rng,
    };

    const thinkMs =
      C.AI_THINK_MIN_MS +
      rng.next() * (C.AI_THINK_MAX_MS - C.AI_THINK_MIN_MS);

    timerRef.current = setTimeout(() => {
      const pos = strategy.chooseShot(view);
      // Aim then fire — BattlefieldScreen handles the animation and resolution
      dispatch({ type: "AIM", pos });
      dispatch({ type: "FIRE" });
    }, thinkMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAITurn, turn, isPortrait]);
}
