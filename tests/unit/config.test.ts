import { describe, it, expect } from "vitest";
import { DEFAULT_CONFIG } from "@lib/game/config";

describe("DEFAULT_CONFIG", () => {
  it("army sums to 7 units", () => {
    const total = Object.values(DEFAULT_CONFIG.ARMY).reduce((a, b) => a + b, 0);
    expect(total).toBe(7);
  });

  it("hit radii are ordered: king > queen > soldier", () => {
    const { HIT_RADIUS } = DEFAULT_CONFIG;
    expect(HIT_RADIUS.king).toBeGreaterThan(HIT_RADIUS.queen);
    expect(HIT_RADIUS.queen).toBeGreaterThan(HIT_RADIUS.soldier);
  });

  it("default rules have shotsPerTurn = 1", () => {
    expect(DEFAULT_CONFIG.DEFAULT_RULES.shotsPerTurn).toBe(1);
  });

  it("all boolean rules default to false", () => {
    const { queenTakesTwo, queenKillSkipsTurn, allUnitsWin } = DEFAULT_CONFIG.DEFAULT_RULES;
    expect(queenTakesTwo).toBe(false);
    expect(queenKillSkipsTurn).toBe(false);
    expect(allUnitsWin).toBe(false);
  });

  it("animation total is sum of phases", () => {
    const { ANIM_INK_MS, ANIM_FOLD_MS, ANIM_PRESS_MS, ANIM_UNFOLD_MS, ANIM_REVEAL_MS, ANIM_TOTAL_MS } = DEFAULT_CONFIG;
    expect(ANIM_INK_MS + ANIM_FOLD_MS + ANIM_PRESS_MS + ANIM_UNFOLD_MS + ANIM_REVEAL_MS).toBe(ANIM_TOTAL_MS);
  });
});
