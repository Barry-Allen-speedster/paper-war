/**
 * Easy AI — aims at random units with huge error. 30% fully random shots.
 * Aware of allUnitsWin rule (still random, just flavour).
 */
import type { Vec2 } from "../game/types";
import type { AIStrategy, AIView } from "./types";
import { idealAimPos, applyAimError, bestBomberPowerAim } from "./aimError";

const EASY_SIGMA = 65;
const RANDOM_CHANCE = 0.30;

export class EasyAI implements AIStrategy {
  chooseShot(view: AIView): Vec2 {
    const { visibleEnemyUnits, rng } = view;

    if (view.bomberPowerShot) {
      const clusterAim = bestBomberPowerAim(visibleEnemyUnits, view.isPortrait);
      if (clusterAim) return applyAimError(clusterAim, EASY_SIGMA, rng);
    }

    if (rng.next() < RANDOM_CHANCE || visibleEnemyUnits.length === 0) {
      return { x: rng.next(), y: rng.next() };
    }

    // Pick a random alive unit
    const target = visibleEnemyUnits[rng.nextInt(0, visibleEnemyUnits.length - 1)]!;
    return applyAimError(idealAimPos(target, view.isPortrait), EASY_SIGMA, rng);
  }
}
