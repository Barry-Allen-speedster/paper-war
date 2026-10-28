/**
 * Medium AI — sees the board, moderate aim error (sigma=30).
 * Prefers units it hasn't hit yet; targets nearest to own crease first.
 * After a miss, applies a correction offset toward the target (converges in ~2-3 turns).
 */
import type { Vec2, Unit } from "../game/types";
import type { AIStrategy, AIView } from "./types";
import { idealShot, applyAimError, refDist } from "./aimError";

const MEDIUM_SIGMA = 30;

export class MediumAI implements AIStrategy {
  /** Last intended target position (for correction after miss) */
  private lastTarget: Vec2 | null = null;
  /** Last actual shot position (for computing correction offset) */
  private lastShot: Vec2 | null = null;

  chooseShot(view: AIView): Vec2 {
    const { visibleEnemyUnits, shotHistory, rng } = view;

    if (visibleEnemyUnits.length === 0) {
      return { x: rng.next(), y: rng.next() };
    }

    // Check last shot for correction opportunity
    const lastShotRecord = shotHistory[shotHistory.length - 1];
    const shouldCorrect =
      lastShotRecord &&
      lastShotRecord.result === "miss" &&
      this.lastTarget !== null &&
      this.lastShot !== null;

    let basePos: Vec2;

    if (shouldCorrect && this.lastTarget && this.lastShot) {
      // Correction: shift toward target using the miss offset
      const errX = this.lastShot.x - this.lastTarget.x;
      const errY = this.lastShot.y - this.lastTarget.y;
      // Apply ~70% correction with some noise
      basePos = {
        x: Math.max(0.01, Math.min(0.99, this.lastTarget.x - errX * 0.7)),
        y: Math.max(0.01, Math.min(0.99, this.lastTarget.y - errY * 0.7)),
      };
    } else {
      // Pick target: prefer units not yet hit, nearest to own crease (y≈0)
      const unhit = visibleEnemyUnits.filter((u) =>
        !shotHistory.some((s) => s.hitUnitId === u.id)
      );
      const candidates = unhit.length > 0 ? unhit : visibleEnemyUnits;

      // Sort by distance to crease (y=0 in normalized space)
      const sorted = [...candidates].sort((a, b) => a.pos.y - b.pos.y);
      const target: Unit = sorted[0]!;

      basePos = idealShot(target);
      this.lastTarget = basePos;
    }

    const shot = applyAimError(basePos, MEDIUM_SIGMA, rng);
    this.lastShot = shot;
    return shot;
  }
}
