import { describe, it, expect } from "vitest";
import { computeShotResult, checkWinCondition, applyShot, buildShot, getSkippedPlayer } from "@lib/game/rules";
import { DEFAULT_CONFIG } from "@lib/game/config";
import { nanoid } from "@lib/utils/nanoid";
import type { Unit, PlayerState, RuleConfig, Vec2 } from "@lib/game/types";

const C = DEFAULT_CONFIG;
const DEFAULT_RULES: RuleConfig = { ...C.DEFAULT_RULES };

function makeUnit(type: Unit["type"], x: number, y: number, id?: string, hitsRemaining = 1): Unit {
  return { id: id ?? nanoid(), type, pos: { x, y }, alive: true, hitsRemaining };
}

function makePlayer(units: Unit[]): PlayerState {
  return {
    id: "p2",
    units,
    shots: [],
    isReady: true,
    layoutLocked: true,
  };
}

/** Convert reference-space coords to normalized for a shot aimed at a unit center */
function aimAt(unit: Unit): Vec2 {
  return { x: unit.pos.x, y: unit.pos.y };
}

describe("rules — hit detection", () => {
  it("shot on unit center is a hit", () => {
    const soldier = makeUnit("soldier", 0.5, 0.5);
    const player = makePlayer([soldier]);
    const result = computeShotResult(aimAt(soldier), player, DEFAULT_RULES);
    expect(result.result).toBe("kill"); // 1 hit kills soldier
    expect(result.hitUnitId).toBe(soldier.id);
  });

  it("shot just inside combined radius hits", () => {
    const soldier = makeUnit("soldier", 0.5, 0.5);
    const player = makePlayer([soldier]);
    // Move shot slightly off center but within combined radius
    const combinedRadius = C.HIT_RADIUS.soldier + C.SHOT_RADIUS;
    const offset = (combinedRadius - 1) / C.REF_SIZE;
    const result = computeShotResult({ x: 0.5 + offset, y: 0.5 }, player, DEFAULT_RULES);
    expect(result.result).toBe("kill");
  });

  it("shot just outside combined radius misses", () => {
    const soldier = makeUnit("soldier", 0.5, 0.5);
    const player = makePlayer([soldier]);
    const combinedRadius = C.HIT_RADIUS.soldier + C.SHOT_RADIUS;
    const offset = (combinedRadius + 2) / C.REF_SIZE;
    const result = computeShotResult({ x: 0.5 + offset, y: 0.5 }, player, DEFAULT_RULES);
    expect(result.result).toBe("miss");
  });

  it("shot on dead unit returns waste", () => {
    const dead: Unit = { ...makeUnit("soldier", 0.5, 0.5), alive: false, hitsRemaining: 0 };
    const player = makePlayer([dead]);
    const result = computeShotResult(aimAt(dead), player, DEFAULT_RULES);
    expect(result.result).toBe("waste");
  });

  it("king kill returns killedUnitType 'king'", () => {
    const king = makeUnit("king", 0.5, 0.5);
    const player = makePlayer([king]);
    const result = computeShotResult(aimAt(king), player, DEFAULT_RULES);
    expect(result.result).toBe("kill");
    expect(result.killedUnitType).toBe("king");
  });

  it("queen takes 2 hits when rule enabled", () => {
    const queen = makeUnit("queen", 0.5, 0.5, "q1", 2);
    const player = makePlayer([queen]);
    const rules: RuleConfig = { ...DEFAULT_RULES, queenTakesTwo: true };
    const result = computeShotResult(aimAt(queen), player, rules);
    expect(result.result).toBe("hit"); // not kill yet
    expect(result.killedUnitType).toBeUndefined();
  });

  it("queen 2nd hit kills when rule enabled", () => {
    const queen = makeUnit("queen", 0.5, 0.5, "q1", 1); // already hit once
    const player = makePlayer([queen]);
    const rules: RuleConfig = { ...DEFAULT_RULES, queenTakesTwo: true };
    const result = computeShotResult(aimAt(queen), player, rules);
    expect(result.result).toBe("kill");
  });

  it("queenKillSkipsTurn rule: killing queen returns skipped player", () => {
    const queen = makeUnit("queen", 0.3, 0.3);
    const player = makePlayer([queen]);
    const rules: RuleConfig = { ...DEFAULT_RULES, queenKillSkipsTurn: true };
    const result = computeShotResult(aimAt(queen), player, rules);
    expect(result.result).toBe("kill");
    expect(result.killedUnitType).toBe("queen");
    expect(getSkippedPlayer(result, "p2", rules)).toBe("p2");
    expect(getSkippedPlayer(result, "p2", DEFAULT_RULES)).toBeNull(); // off by default
  });
});

describe("rules — win condition", () => {
  it("king dead → attacker wins", () => {
    const king: Unit = { ...makeUnit("king", 0.5, 0.5), alive: false, hitsRemaining: 0 };
    const player = makePlayer([king]);
    expect(checkWinCondition(player, "p1", DEFAULT_RULES)).toBe("p1");
  });

  it("king alive → no win", () => {
    const king = makeUnit("king", 0.5, 0.5);
    const player = makePlayer([king]);
    expect(checkWinCondition(player, "p1", DEFAULT_RULES)).toBeNull();
  });

  it("allUnitsWin: all dead → attacker wins", () => {
    const units: Unit[] = [
      { ...makeUnit("soldier", 0.3, 0.3), alive: false, hitsRemaining: 0 },
      { ...makeUnit("king", 0.7, 0.7), alive: false, hitsRemaining: 0 },
    ];
    const player = makePlayer(units);
    const rules: RuleConfig = { ...DEFAULT_RULES, allUnitsWin: true };
    expect(checkWinCondition(player, "p1", rules)).toBe("p1");
  });

  it("allUnitsWin: king dead but soldier alive → no win (must get all)", () => {
    const units: Unit[] = [
      makeUnit("soldier", 0.3, 0.3), // still alive
      { ...makeUnit("king", 0.7, 0.7), alive: false, hitsRemaining: 0 },
    ];
    const player = makePlayer(units);
    const rules: RuleConfig = { ...DEFAULT_RULES, allUnitsWin: true };
    // King alone dead is NOT enough when allUnitsWin is on
    expect(checkWinCondition(player, "p1", rules)).toBeNull();
  });

  it("allUnitsWin: some alive → no win", () => {
    const units: Unit[] = [
      { ...makeUnit("soldier", 0.3, 0.3), alive: false, hitsRemaining: 0 },
      makeUnit("king", 0.7, 0.7),
    ];
    const player = makePlayer(units);
    const rules: RuleConfig = { ...DEFAULT_RULES, allUnitsWin: true };
    expect(checkWinCondition(player, "p1", rules)).toBeNull();
  });

  it("default rules: king dead → attacker wins immediately", () => {
    const king: Unit = { ...makeUnit("king", 0.5, 0.5), alive: false, hitsRemaining: 0 };
    const soldier = makeUnit("soldier", 0.3, 0.3); // still alive
    const player = makePlayer([king, soldier]);
    // Without allUnitsWin, king death always wins
    expect(checkWinCondition(player, "p1", DEFAULT_RULES)).toBe("p1");
  });
});

describe("rules — applyShot", () => {
  it("hit decrements hitsRemaining", () => {
    const queen = makeUnit("queen", 0.5, 0.5, "q1", 2);
    const player = makePlayer([queen]);
    const computed = computeShotResult(aimAt(queen), player, { ...DEFAULT_RULES, queenTakesTwo: true });
    const shot = buildShot(aimAt(queen), "p1", 1, computed);
    const updated = applyShot(computed, shot, player, DEFAULT_RULES);
    const updatedQueen = updated.units.find((u) => u.id === "q1")!;
    expect(updatedQueen.hitsRemaining).toBe(1);
    expect(updatedQueen.alive).toBe(true);
  });

  it("miss does not change player state", () => {
    const soldier = makeUnit("soldier", 0.5, 0.5);
    const player = makePlayer([soldier]);
    const missPos: Vec2 = { x: 0.9, y: 0.9 };
    const computed = computeShotResult(missPos, player, DEFAULT_RULES);
    expect(computed.result).toBe("miss");
    const shot = buildShot(missPos, "p1", 1, computed);
    const updated = applyShot(computed, shot, player, DEFAULT_RULES);
    expect(updated).toEqual(player);
  });
});
