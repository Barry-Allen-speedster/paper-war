/**
 * AI strategy interface — v0.2.
 * The AI can now see the full board (open information).
 * Difficulty comes from aim error and target priority, not search.
 */
import type { Unit, Vec2, GameConfig } from "../game/types";
import type { RNG } from "../game/rng";

export interface AIView {
  /** All alive enemy units (fully visible) */
  visibleEnemyUnits: Unit[];
  /** All enemy units including dead (for "don't re-target dead" logic) */
  allEnemyUnits: Unit[];
  /** Own shots history with results */
  shotHistory: import("../game/types").Shot[];
  config: GameConfig;
  /** This is the AI's randomly assigned powered bomber shot. */
  bomberPowerShot?: boolean;
  /** Battlefield is portrait, so the fold mirrors Y instead of X. */
  isPortrait?: boolean;
  rng: RNG;
}

export interface AIStrategy {
  /** Returns a position on the AI's OWN half ([0,1]×[0,1]). */
  chooseShot(view: AIView): Vec2;
}
