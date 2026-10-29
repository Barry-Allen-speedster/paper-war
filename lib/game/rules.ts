/**
 * Hit detection, shot resolution, and win condition checking.
 * All geometry runs in reference space (0..1000).
 */
import type { Vec2, Unit, Shot, PlayerState, ShotResult, UnitType, PlayerId, RuleConfig } from "./types";
import { DEFAULT_CONFIG } from "./config";
import { toRef, distance, quadrantOf } from "./geometry";
import { nanoid } from "../utils/nanoid";

const C = DEFAULT_CONFIG;

export interface ShotComputeResult {
  result: ShotResult;
  hitUnitId?: string;
  killedUnitType?: UnitType;
  revealedQuadrant?: 0 | 1 | 2 | 3;
}

/**
 * Compute the result of a shot at `pos` against `targetPlayer`.
 * Does not mutate state — returns a descriptor.
 */
export function computeShotResult(
  pos: Vec2,
  targetPlayer: PlayerState,
  rules: RuleConfig
): ShotComputeResult {
  const posRef = toRef(pos);

  // Check dead units first → "waste"
  for (const unit of targetPlayer.units) {
    if (!unit.alive) {
      const unitRef = toRef(unit.pos);
      const combinedRadius = C.HIT_RADIUS[unit.type] + C.SHOT_RADIUS;
      if (distance(posRef, unitRef) < combinedRadius) {
        return { result: "waste" };
      }
    }
  }

  // Check living units
  for (const unit of targetPlayer.units) {
    if (!unit.alive) continue;
    const unitRef = toRef(unit.pos);
    const combinedRadius = C.HIT_RADIUS[unit.type] + C.SHOT_RADIUS;

    if (distance(posRef, unitRef) < combinedRadius) {
      const newHitsRemaining = unit.hitsRemaining - 1;
      const killed = newHitsRemaining <= 0;
      const result: ShotResult = killed ? "kill" : "hit";

      const out: ShotComputeResult = {
        result,
        hitUnitId: unit.id,
        killedUnitType: killed ? unit.type : undefined,
      };

      return out;
    }
  }

  return { result: "miss" };
}

/**
 * Apply a shot result to a PlayerState, returning the updated state.
 * Pure — no mutation.
 */
export function applyShot(
  shotResult: ShotComputeResult,
  shot: Shot,
  targetPlayer: PlayerState,
  rules: RuleConfig
): PlayerState {
  if (shotResult.result === "miss" || shotResult.result === "waste") {
    return targetPlayer;
  }

  const updatedUnits = targetPlayer.units.map((unit): Unit => {
    if (unit.id !== shotResult.hitUnitId) return unit;
    const newHitsRemaining = unit.hitsRemaining - 1;
    const alive = newHitsRemaining > 0;
    return { ...unit, hitsRemaining: newHitsRemaining, alive };
  });

  return { ...targetPlayer, units: updatedUnits };
}

/**
 * Build initial PlayerState unit hitsRemaining based on rules.
 * Queen gets 2 hits if queenTakesTwo is enabled.
 */
export function applyRulesToArmy(units: Unit[], rules: RuleConfig): Unit[] {
  return units.map((u): Unit => ({
    ...u,
    hitsRemaining:
      u.type === "queen" && rules.queenTakesTwo ? 2 :
      u.type === "king"  && rules.kingTakesFour ? 4 :
      1,
  }));
}

/**
 * Check if the win condition has been met against the target player.
 *
 * Default (allUnitsWin=false): destroy the King to win.
 * allUnitsWin=true: must destroy ALL enemy units (King alone isn't enough).
 */
export function checkWinCondition(
  targetPlayer: PlayerState,
  attackerId: PlayerId,
  rules: RuleConfig
): PlayerId | null {
  const allDead = targetPlayer.units.every((u) => !u.alive);

  if (rules.allUnitsWin) {
    // Must eliminate every unit — King alone dying doesn't end the game
    return allDead ? attackerId : null;
  }

  // Default: killing the King wins immediately
  const king = targetPlayer.units.find((u) => u.type === "king");
  if (king && !king.alive) return attackerId;

  return null;
}

/**
 * If the queenKillSkipsTurn rule is on and the queen was just killed,
 * returns the defender's playerId (whose turn should be skipped).
 * Returns null otherwise.
 */
export function getSkippedPlayer(
  shot: ShotComputeResult,
  defenderId: PlayerId,
  rules: RuleConfig
): PlayerId | null {
  if (
    rules.queenKillSkipsTurn &&
    shot.result === "kill" &&
    shot.killedUnitType === "queen"
  ) {
    return defenderId;
  }
  return null;
}

/**
 * Build a Shot object from a compute result.
 */
export function buildShot(
  pos: Vec2,
  by: PlayerId,
  turn: number,
  computed: ShotComputeResult
): Shot {
  return {
    id: nanoid(),
    pos,
    by,
    turn,
    result: computed.result,
    hitUnitId: computed.hitUnitId,
    killedUnitType: computed.killedUnitType,
    revealedQuadrant: computed.revealedQuadrant,
  };
}
