/**
 * Hit detection, shot resolution, and win condition checking.
 * All geometry runs in reference space (0..1000).
 */
import type { Vec2, Unit, Shot, PlayerState, ShotResult, UnitType, PlayerId, RuleConfig } from "./types";
import { DEFAULT_CONFIG } from "./config";
import { toRef, distance, quadrantOf } from "./geometry";
import { nanoid } from "../utils/nanoid";
import { createRNG } from "./rng";

const C = DEFAULT_CONFIG;

export interface ShotComputeResult {
  result: ShotResult;
  hitUnitId?: string;
  killedUnitType?: UnitType;
  splashKilledUnitIds?: string[];
  bomberPowerShot?: boolean;
  bomberPowerHitUnitIds?: string[];
  bomberPowerKilledUnitIds?: string[];
  bomberPowerKilledUnitTypes?: UnitType[];
  revealedQuadrant?: 0 | 1 | 2 | 3;
}

/** Each player gets one deterministic, random powered shot in their first four shots. */
export function getBomberPowerShotNumber(seed: number, playerId: PlayerId): number {
  const playerSeed = (seed + (playerId === "p1" ? 0x51f15e : 0x2c9277)) >>> 0;
  return createRNG(playerSeed).nextInt(1, C.BOMBER_POWER_SHOT_WINDOW);
}

export function hasLivingBomber(player: PlayerState, enabled: boolean): boolean {
  return enabled && player.units.some((unit) => unit.type === "bomber" && unit.alive);
}

export function isBomberPowerShot(
  seed: number,
  playerId: PlayerId,
  shotsTaken: number,
  player: PlayerState,
  enabled: boolean
): boolean {
  return shotsTaken < C.BOMBER_POWER_SHOT_WINDOW &&
    shotsTaken + 1 === getBomberPowerShotNumber(seed, playerId) &&
    hasLivingBomber(player, enabled);
}

/** Return living units caught in a bomber's blast, excluding the bomber itself. */
export function getBomberBlastVictimIds(bomber: Unit, units: Unit[]): string[] {
  const bomberPos = toRef(bomber.pos);
  return units
    .filter((unit) =>
      unit.alive &&
      unit.id !== bomber.id &&
      distance(bomberPos, toRef(unit.pos)) <= C.BOMBER_BLAST_RADIUS
    )
    .map((unit) => unit.id);
}

/** Return all living units within a powered bomber shot's area of effect. */
export function getBomberPowerShotVictimIds(pos: Vec2, units: Unit[]): string[] {
  const shotPos = toRef(pos);
  return units
    .filter((unit) => unit.alive && distance(shotPos, toRef(unit.pos)) <= C.BOMBER_POWER_SHOT_RADIUS)
    .map((unit) => unit.id);
}

/**
 * Compute the result of a shot at `pos` against `targetPlayer`.
 * Does not mutate state — returns a descriptor.
 */
export function computeShotResult(
  pos: Vec2,
  targetPlayer: PlayerState,
  rules: RuleConfig,
  bomberPowerShot = false
): ShotComputeResult {
  const posRef = toRef(pos);

  if (bomberPowerShot) {
    const blastHits = targetPlayer.units.filter((unit) =>
      unit.alive && distance(posRef, toRef(unit.pos)) <= C.BOMBER_POWER_SHOT_RADIUS
    );
    if (blastHits.length > 0) {
      const killed = blastHits.filter((unit) => unit.hitsRemaining <= 1);
      return {
        result: killed.length > 0 ? "kill" : "hit",
        hitUnitId: blastHits[0]!.id,
        killedUnitType: killed[0]?.type,
        bomberPowerShot: true,
        bomberPowerHitUnitIds: blastHits.map((unit) => unit.id),
        bomberPowerKilledUnitIds: killed.map((unit) => unit.id),
        bomberPowerKilledUnitTypes: killed.map((unit) => unit.type),
      };
    }
  }

  // Check dead units first → "waste"
  for (const unit of targetPlayer.units) {
    if (!unit.alive) {
      const unitRef = toRef(unit.pos);
      const combinedRadius = C.HIT_RADIUS[unit.type] + C.SHOT_RADIUS;
      if (distance(posRef, unitRef) < combinedRadius) {
        return { result: "waste", bomberPowerShot };
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
        bomberPowerShot,
        hitUnitId: unit.id,
        killedUnitType: killed ? unit.type : undefined,
        ...(killed && unit.type === "bomber"
          ? { splashKilledUnitIds: getBomberBlastVictimIds(unit, targetPlayer.units) }
          : {}),
      };

      return out;
    }
  }

  return { result: "miss", bomberPowerShot };
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

  const splashVictims = new Set(shotResult.splashKilledUnitIds ?? []);
  const powerHitIds = new Set(shotResult.bomberPowerHitUnitIds ?? []);
  const powerKilledIds = new Set(shotResult.bomberPowerKilledUnitIds ?? []);
  const updatedUnits = targetPlayer.units.map((unit): Unit => {
    if (splashVictims.has(unit.id)) {
      return { ...unit, alive: false, hitsRemaining: 0 };
    }
    if (powerHitIds.has(unit.id)) {
      const hitsRemaining = powerKilledIds.has(unit.id) ? 0 : unit.hitsRemaining - 1;
      return { ...unit, hitsRemaining, alive: hitsRemaining > 0 };
    }
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
    (shot.killedUnitType === "queen" || shot.bomberPowerKilledUnitTypes?.includes("queen"))
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
    splashKilledUnitIds: computed.splashKilledUnitIds,
    bomberPowerShot: computed.bomberPowerShot,
    bomberPowerHitUnitIds: computed.bomberPowerHitUnitIds,
    bomberPowerKilledUnitIds: computed.bomberPowerKilledUnitIds,
    bomberPowerKilledUnitTypes: computed.bomberPowerKilledUnitTypes,
    revealedQuadrant: computed.revealedQuadrant,
  };
}
