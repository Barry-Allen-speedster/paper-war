/**
 * Aim error helpers for the open-information AI.
 *
 * idealShot(unit) → the exact (u,v) mirror of the unit's position.
 *   A shot placed at (u,v) on the AI's own half folds to (u,v)
 *   on the opponent's half — so the "perfect" shot IS the unit's position.
 *
 * applyAimError(pos, sigma, rng) → Gaussian perturbation, clamped to [0,1].
 *   sigma is in reference units (0..1000 space).
 */
import type { Unit, Vec2 } from "../game/types";
import { DEFAULT_CONFIG } from "../game/config";
import type { RNG } from "../game/rng";

const C = DEFAULT_CONFIG;

/**
 * The ideal shot position for a target unit.
 *
 * The AI aims on ITS OWN half. BattlefieldScreen.handleFoldComplete
 * then mirrors the X axis (1 - x) before computing the hit.
 * So to land at unit.pos.x on the OPPONENT's half, the AI must aim at
 * (1 - unit.pos.x) on its own half. Y is unchanged (fold preserves Y).
 */
export function idealShot(unit: Unit): Vec2 {
  return { x: 1 - unit.pos.x, y: unit.pos.y };
}

/**
 * Apply Gaussian aim error with given sigma (in reference units).
 * Uses Box-Muller transform with the seeded RNG.
 * Result is clamped to [0.01, 0.99] so it stays on the board.
 */
export function applyAimError(pos: Vec2, sigma: number, rng: RNG): Vec2 {
  const sigmaNorm = sigma / C.REF_SIZE;

  // Box-Muller transform → two independent Gaussian samples
  const u1 = Math.max(1e-10, rng.next());
  const u2 = rng.next();
  const mag = Math.sqrt(-2 * Math.log(u1));
  const dx = mag * Math.cos(2 * Math.PI * u2) * sigmaNorm;
  const dy = mag * Math.sin(2 * Math.PI * u2) * sigmaNorm;

  return {
    x: Math.max(0.01, Math.min(0.99, pos.x + dx)),
    y: Math.max(0.01, Math.min(0.99, pos.y + dy)),
  };
}

/**
 * Compute the Euclidean distance in reference units between two normalized positions.
 */
export function refDist(a: Vec2, b: Vec2): number {
  const dx = (a.x - b.x) * C.REF_SIZE;
  const dy = (a.y - b.y) * C.REF_SIZE;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Count how many alive units would be hit if a shot lands at pos.
 * Checks each unit: hit if distance(pos, unit.pos) < unit.hitRadius + SHOT_RADIUS.
 */
export function countOverlap(pos: Vec2, aliveUnits: Unit[]): number {
  let count = 0;
  for (const u of aliveUnits) {
    const combinedRadius = (C.HIT_RADIUS[u.type] + C.SHOT_RADIUS) / C.REF_SIZE;
    const dx = pos.x - u.pos.x;
    const dy = pos.y - u.pos.y;
    if (dx * dx + dy * dy < combinedRadius * combinedRadius) count++;
  }
  return count;
}
