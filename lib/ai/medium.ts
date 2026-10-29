/**
 * Medium AI — rule-aware target selection, miss-correction, sigma=28.
 *
 * Priority adapts to active rules:
 *   allUnitsWin OFF → King first, then Queen (for queenKillSkipsTurn bonus), then soldiers
 *   allUnitsWin ON  → Clear soldiers first (easy kills), then Queen, then King
 *   queenKillSkipsTurn → Queen jumps to second priority even in normal mode
 */
import type { Vec2, Unit } from "../game/types";
import type { AIStrategy, AIView } from "./types";
import { idealAimPos, applyAimError, bestBomberPowerAim } from "./aimError";
import { getBomberBlastVictimIds } from "../game/rules";

const MEDIUM_SIGMA = 28;

export class MediumAI implements AIStrategy {
  private lastTarget: Vec2 | null = null;
  private lastShot: Vec2 | null = null;
  private lastTargetUnit: Unit | null = null;

  chooseShot(view: AIView): Vec2 {
    const { visibleEnemyUnits, shotHistory, rng, config } = view;
    const rules = config.rules;

    if (visibleEnemyUnits.length === 0) return { x: rng.next(), y: rng.next() };

    if (view.bomberPowerShot) {
      const clusterAim = bestBomberPowerAim(visibleEnemyUnits, view.isPortrait);
      if (clusterAim) return applyAimError(clusterAim, MEDIUM_SIGMA, rng);
    }

    const lastShot = shotHistory[shotHistory.length - 1];

    // Miss-correction: if last shot missed the current target, nudge toward it
    if (
      lastShot?.result === "miss" &&
      this.lastTarget &&
      this.lastShot &&
      this.lastTargetUnit &&
      visibleEnemyUnits.some((u) => u.id === this.lastTargetUnit!.id)
    ) {
      const errX = this.lastShot.x - this.lastTarget.x;
      const errY = this.lastShot.y - this.lastTarget.y;
      const corrected = {
        x: Math.max(0.01, Math.min(0.99, this.lastTarget.x - errX * 0.75)),
        y: Math.max(0.01, Math.min(0.99, this.lastTarget.y - errY * 0.75)),
      };
      const shot = applyAimError(corrected, MEDIUM_SIGMA * 0.7, rng);
      this.lastShot = shot;
      return shot;
    }

    // Pick target based on active rules
    const target = this.pickTarget(visibleEnemyUnits, shotHistory, rules);
    const aim = idealAimPos(target, view.isPortrait);
    this.lastTarget = aim;
    this.lastTargetUnit = target;
    const shot = applyAimError(aim, MEDIUM_SIGMA, rng);
    this.lastShot = shot;
    return shot;
  }

  private pickTarget(
    units: Unit[],
    shots: import("../game/types").Shot[],
    rules: import("../game/types").RuleConfig
  ): Unit {
    const king = units.find((u) => u.type === "king");
    const queen = units.find((u) => u.type === "queen");
    const bomber = units.find((u) => u.type === "bomber");
    const soldiers = units.filter((u) => u.type === "soldier" || u.type === "bomber");

    // Take a bomber shot when its blast can remove multiple units at once.
    if (bomber && getBomberBlastVictimIds(bomber, units).length >= 2) return bomber;

    if (rules.allUnitsWin) {
      // Must kill everything — pick easiest (most-hit soldiers first, then queen, then king)
      // Among soldiers, prefer the one with fewest hitsRemaining (nearest to death)
      if (soldiers.length > 0) {
        return soldiers.sort((a, b) => a.hitsRemaining - b.hitsRemaining)[0]!;
      }
      if (queen) return queen;
      if (king) return king;
    } else {
      // Default: King is the win condition — go for it
      if (king) return king;
      // If king not visible (shouldn't happen with open info), target queen
      if (queen && rules.queenKillSkipsTurn) return queen;
      if (queen) return queen;
    }

    // Fallback: any unit
    return units[0]!;
  }
}
