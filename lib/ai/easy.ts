/**
 * Easy AI — sees the board, picks a random alive enemy unit,
 * applies large aim error (sigma=60), and fires completely randomly 25% of the time.
 */
import type { Vec2 } from "../game/types";
import type { AIStrategy, AIView } from "./types";
import { idealAimPos, applyAimError } from "./aimError";
import { DEFAULT_CONFIG } from "../game/config";

const C = DEFAULT_CONFIG;
const EASY_SIGMA = 60;
const RANDOM_CHANCE = 0.25;

export class EasyAI implements AIStrategy {
  chooseShot(view: AIView): Vec2 {
    const { visibleEnemyUnits, rng } = view;

    // 25% chance: fire completely randomly
    if (rng.next() < RANDOM_CHANCE || visibleEnemyUnits.length === 0) {
      return { x: rng.next(), y: rng.next() };
    }

    // Pick a random alive unit
    const target = visibleEnemyUnits[rng.nextInt(0, visibleEnemyUnits.length - 1)]!;
    const aim = idealAimPos(target);
    return applyAimError(aim, EASY_SIGMA, rng);
  }
}
