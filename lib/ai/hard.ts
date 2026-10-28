/**
 * Hard AI — sees the board, small aim error (sigma=8).
 * Priority: King > Queen > "double-hit soldier" (covers 2+ units).
 * Searches for the shot that maximises overlap count; prefers King even at lower overlap.
 */
import type { Vec2, Unit } from "../game/types";
import type { AIStrategy, AIView } from "./types";
import { idealShot, applyAimError, countOverlap } from "./aimError";
import { DEFAULT_CONFIG } from "../game/config";

const C = DEFAULT_CONFIG;
const HARD_SIGMA = 8;
/** Number of candidate positions to sample when searching for max overlap */
const SEARCH_SAMPLES = 40;

export class HardAI implements AIStrategy {
  chooseShot(view: AIView): Vec2 {
    const { visibleEnemyUnits, rng } = view;

    if (visibleEnemyUnits.length === 0) {
      return { x: rng.next(), y: rng.next() };
    }

    // 1. Always try the King first if alive
    const king = visibleEnemyUnits.find((u) => u.type === "king");
    if (king) {
      return applyAimError(idealShot(king), HARD_SIGMA, rng);
    }

    // 2. Try Queen
    const queen = visibleEnemyUnits.find((u) => u.type === "queen");

    // 3. Find best overlap shot among all alive units
    let bestPos: Vec2 = idealShot(visibleEnemyUnits[0]!);
    let bestOverlap = 0;

    for (const unit of visibleEnemyUnits) {
      const ideal = idealShot(unit);
      // Sample around ideal position to find best overlap
      for (let i = 0; i < SEARCH_SAMPLES; i++) {
        const sigma = i === 0 ? 0 : HARD_SIGMA * 2; // First try exact, then jitter
        const candidate = i === 0 ? ideal : applyAimError(ideal, sigma, rng);
        const overlap = countOverlap(candidate, visibleEnemyUnits);

        // Prefer queen even at equal overlap
        const isQueenTarget = queen && unit.type === "queen";
        if (overlap > bestOverlap || (overlap === bestOverlap && isQueenTarget)) {
          bestOverlap = overlap;
          bestPos = candidate;
        }
      }
    }

    return applyAimError(bestPos, HARD_SIGMA, rng);
  }
}
