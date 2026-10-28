/**
 * Hard AI — sees the board, small aim error (sigma=8).
 * Priority: King > Queen > soldier with most overlap.
 *
 * idealAimPos(unit) returns the aim position on the AI's own half.
 * After the fold, that aim mirrors to land on unit.pos on the opponent's half.
 */
import type { Vec2 } from "../game/types";
import type { AIStrategy, AIView } from "./types";
import { idealAimPos, applyAimError, countOverlap } from "./aimError";

const HARD_SIGMA = 8;
const SEARCH_SAMPLES = 30;

export class HardAI implements AIStrategy {
  chooseShot(view: AIView): Vec2 {
    const { visibleEnemyUnits, rng } = view;

    if (visibleEnemyUnits.length === 0) {
      return { x: rng.next(), y: rng.next() };
    }

    // Always go for the King first
    const king = visibleEnemyUnits.find((u) => u.type === "king");
    if (king) {
      return applyAimError(idealAimPos(king), HARD_SIGMA, rng);
    }

    // Then Queen
    const queen = visibleEnemyUnits.find((u) => u.type === "queen");
    if (queen) {
      return applyAimError(idealAimPos(queen), HARD_SIGMA, rng);
    }

    // Find the aim position that hits the most units
    let bestPos: Vec2 = idealAimPos(visibleEnemyUnits[0]!);
    let bestOverlap = 0;

    for (const unit of visibleEnemyUnits) {
      const aim = idealAimPos(unit);
      for (let i = 0; i < SEARCH_SAMPLES; i++) {
        const candidate = i === 0 ? aim : applyAimError(aim, HARD_SIGMA * 2, rng);
        // The candidate aims at (candidate.x, candidate.y) on own half.
        // After fold mirror, it lands at (1 - candidate.x, candidate.y) on opponent half.
        const landingPos = { x: 1 - candidate.x, y: candidate.y };
        const overlap = countOverlap(landingPos, visibleEnemyUnits);
        if (overlap > bestOverlap) {
          bestOverlap = overlap;
          bestPos = candidate;
        }
      }
    }

    return applyAimError(bestPos, HARD_SIGMA, rng);
  }
}
