import { describe, it, expect } from "vitest";
import { EasyAI } from "@lib/ai/easy";
import { MediumAI } from "@lib/ai/medium";
import { HardAI } from "@lib/ai/hard";
import { idealShot, applyAimError } from "@lib/ai/aimError";
import { buildArmy, randomPlacement, validateArmy } from "@lib/game/placement";
import { computeShotResult, checkWinCondition, buildShot, applyShot } from "@lib/game/rules";
import { createRNG } from "@lib/game/rng";
import { DEFAULT_CONFIG } from "@lib/game/config";
import type { PlayerState, Shot } from "@lib/game/types";
import type { AIView } from "@lib/ai/types";
import type { AIStrategy } from "@lib/ai/types";

const C = DEFAULT_CONFIG;
const RULES = { ...C.DEFAULT_RULES };
const CONFIG = { mode: "ai" as const, difficulty: "hard" as const, rules: RULES, seed: 1 };

function makePlayer(id: "p1" | "p2", seed: number): PlayerState {
  const rng = createRNG(seed);
  const army = buildArmy(id);
  const placed = randomPlacement(army, rng);
  return { id, units: placed, shots: [], isReady: true, layoutLocked: true };
}

/**
 * Simulate a game between two AI strategies.
 * attacker goes first; both see the FULL board (open information).
 * Returns "attacker" | "defender" | "draw".
 */
function simulateGame(
  attackerStrategy: AIStrategy,
  defenderStrategy: AIStrategy,
  attackerSeed: number,
  defenderSeed: number
): "attacker" | "defender" | "draw" {
  let attackerPlayer = makePlayer("p1", attackerSeed);
  let defenderPlayer = makePlayer("p2", defenderSeed);

  const attackerShots: Shot[] = [];
  const defenderShots: Shot[] = [];

  for (let turn = 0; turn < 500; turn++) {
    // ── Attacker fires ────────────────────────────────────────────────────
    const attackerView: AIView = {
      visibleEnemyUnits: defenderPlayer.units.filter((u) => u.alive),
      allEnemyUnits: defenderPlayer.units,
      shotHistory: attackerShots,
      config: CONFIG,
      rng: createRNG(attackerSeed + turn * 3 + 7),
    };
    const aPos = attackerStrategy.chooseShot(attackerView);
    // AI aims on own half — mirror X to get landing position on opponent's half
    const aLanding = { x: 1 - aPos.x, y: aPos.y };
    const aComputed = computeShotResult(aLanding, defenderPlayer, RULES);
    const aShot = buildShot(aLanding, "p1", turn, aComputed);
    attackerShots.push(aShot);
    defenderPlayer = applyShot(aComputed, aShot, defenderPlayer, RULES);
    if (checkWinCondition(defenderPlayer, "p1", RULES)) return "attacker";

    // ── Defender fires ────────────────────────────────────────────────────
    const defenderView: AIView = {
      visibleEnemyUnits: attackerPlayer.units.filter((u) => u.alive),
      allEnemyUnits: attackerPlayer.units,
      shotHistory: defenderShots,
      config: { ...CONFIG, difficulty: "easy" },
      rng: createRNG(defenderSeed + turn * 7 + 3),
    };
    const dPos = defenderStrategy.chooseShot(defenderView);
    const dLanding = { x: 1 - dPos.x, y: dPos.y };
    const dComputed = computeShotResult(dLanding, attackerPlayer, RULES);
    const dShot = buildShot(dLanding, "p2", turn, dComputed);
    defenderShots.push(dShot);
    attackerPlayer = applyShot(dComputed, dShot, attackerPlayer, RULES);
    if (checkWinCondition(attackerPlayer, "p2", RULES)) return "defender";
  }
  return "draw";
}

describe("AI simulation", () => {
  it("Hard AI wins ≥ 70% against Easy over 1000 games", () => {
    const GAMES = 1000;
    let hardWins = 0;

    for (let i = 0; i < GAMES; i++) {
      // Fresh instances per game
      const result = simulateGame(
        new HardAI(), new EasyAI(),
        i * 13 + 1, i * 17 + 2
      );
      if (result === "attacker") hardWins++;
    }

    const rate = hardWins / GAMES;
    console.warn(`Hard vs Easy: ${hardWins}/1000 = ${(rate * 100).toFixed(1)}%`);
    expect(rate).toBeGreaterThanOrEqual(0.70);
  }, 120_000);

  it("Medium AI wins ≥ 60% against Easy over 500 games", () => {
    const GAMES = 500;
    let medWins = 0;

    for (let i = 0; i < GAMES; i++) {
      const result = simulateGame(
        new MediumAI(), new EasyAI(),
        i * 11 + 3, i * 19 + 5
      );
      if (result === "attacker") medWins++;
    }

    const rate = medWins / GAMES;
    console.warn(`Medium vs Easy: ${medWins}/500 = ${(rate * 100).toFixed(1)}%`);
    expect(rate).toBeGreaterThanOrEqual(0.60);
  }, 60_000);

  it("AI placement passes validateArmy", () => {
    for (let seed = 0; seed < 20; seed++) {
      const player = makePlayer("p1", seed);
      expect(validateArmy(player.units).valid).toBe(true);
    }
  });

  it("idealShot mirrors unit position exactly", () => {
    const unit = { id: "k", type: "king" as const, pos: { x: 0.3, y: 0.7 }, alive: true, hitsRemaining: 1 };
    const shot = idealShot(unit);
    expect(shot.x).toBe(0.3);
    expect(shot.y).toBe(0.7);
  });

  it("applyAimError keeps result in [0,1]", () => {
    const rng = createRNG(42);
    for (let i = 0; i < 200; i++) {
      const pos = applyAimError({ x: 0.5, y: 0.5 }, 60, rng);
      expect(pos.x).toBeGreaterThanOrEqual(0);
      expect(pos.x).toBeLessThanOrEqual(1);
      expect(pos.y).toBeGreaterThanOrEqual(0);
      expect(pos.y).toBeLessThanOrEqual(1);
    }
  });
});
