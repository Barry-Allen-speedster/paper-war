/**
 * Placement validation and random placement for Paper War.
 * All validation runs in reference space (0..1000).
 */
import type { Unit, UnitType, Vec2, RuleConfig } from "./types";
import { DEFAULT_CONFIG } from "./config";
import { toRef, distance } from "./geometry";
import type { RNG } from "./rng";

const C = DEFAULT_CONFIG;

export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

/**
 * Check if placing `unit` at its current pos is valid given existing units.
 * Operates in reference space internally.
 */
export function isValidPlacement(
  unit: Unit,
  existingUnits: Unit[]
): ValidationResult {
  const posRef = toRef(unit.pos);
  const radius = C.HIT_RADIUS[unit.type];

  // Edge margin check
  if (posRef.x < C.EDGE_MARGIN + radius) {
    return { valid: false, reason: "Too close to left edge" };
  }
  if (posRef.x > C.REF_SIZE - C.EDGE_MARGIN - radius) {
    return { valid: false, reason: "Too close to right edge" };
  }
  if (posRef.y < C.CREASE_MARGIN + radius) {
    return { valid: false, reason: "Too close to crease" };
  }
  if (posRef.y > C.REF_SIZE - C.EDGE_MARGIN - radius) {
    return { valid: false, reason: "Too close to bottom edge" };
  }

  // Overlap check with other units
  for (const other of existingUnits) {
    if (other.id === unit.id) continue;
    const otherRef = toRef(other.pos);
    const minDist =
      radius + C.HIT_RADIUS[other.type] + C.MIN_UNIT_SPACING;
    if (distance(posRef, otherRef) < minDist) {
      return { valid: false, reason: `Overlaps with ${other.type} ${other.id}` };
    }
  }

  return { valid: true };
}

/**
 * Validate an entire army (all units placed and non-overlapping).
 */
export function validateArmy(units: Unit[]): ValidationResult {
  for (const unit of units) {
    const others = units.filter((u) => u.id !== unit.id);
    const result = isValidPlacement(unit, others);
    if (!result.valid) return result;
  }
  return { valid: true };
}

/**
 * Build the initial unplaced army for a player.
 * Units have placeholder positions at (0, 0) and alive=true.
 */
export function buildArmy(
  playerId: string,
  options: Pick<RuleConfig, "soldierCount" | "bomberEnabled"> = C.DEFAULT_RULES
): Unit[] {
  const units: Unit[] = [];
  let idx = 0;

  const types: UnitType[] = [
    ...Array<UnitType>(options.soldierCount).fill("soldier"),
    ...(options.bomberEnabled ? ["bomber" as UnitType] : []),
    ...Array<UnitType>(C.ARMY.queen).fill("queen"),
    ...Array<UnitType>(C.ARMY.king).fill("king"),
  ];

  for (const type of types) {
    units.push({
      id: `${playerId}-${type}-${idx++}`,
      type,
      pos: { x: 0, y: 0 },
      alive: true,
      hitsRemaining: 1,
    });
  }

  return units;
}

/**
 * Generate a valid random placement for all units of the given types.
 * Deterministic given the same RNG state.
 * Throws if it fails after maxAttempts (should never happen with normal config).
 */
export function randomPlacement(
  units: Unit[],
  rng: RNG,
  maxAttempts = 1000
): Unit[] {
  const placed: Unit[] = [];

  for (const unit of units) {
    let placed_unit: Unit | null = null;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const radius = C.HIT_RADIUS[unit.type];
      const margin = C.EDGE_MARGIN + radius;
      const creaseMargin = C.CREASE_MARGIN + radius;

      // Sample in reference space then convert
      const refX = rng.nextFloat(margin, C.REF_SIZE - margin);
      const refY = rng.nextFloat(creaseMargin, C.REF_SIZE - margin);

      const candidate: Unit = {
        ...unit,
        pos: { x: refX / C.REF_SIZE, y: refY / C.REF_SIZE },
      };

      const result = isValidPlacement(candidate, placed);
      if (result.valid) {
        placed_unit = candidate;
        break;
      }
    }

    if (!placed_unit) {
      throw new Error(`Could not place unit ${unit.id} after ${maxAttempts} attempts`);
    }
    placed.push(placed_unit);
  }

  return placed;
}

/**
 * Move a single unit to a new position (returns a new Unit with updated pos).
 */
export function moveUnit(unit: Unit, pos: Vec2): Unit {
  return { ...unit, pos };
}
