import { describe, it, expect } from "vitest";
import { EasyAI } from "@lib/ai/easy";
import { createRNG } from "@lib/game/rng";
import { DEFAULT_CONFIG } from "@lib/game/config";
import type { AIView } from "@lib/ai/types";
import type { Unit } from "@lib/game/types";

const C = DEFAULT_CONFIG;

function makeUnit(type: Unit["type"], x: number, y: number, id = "u1"): Unit {
  return { id, type, pos: { x, y }, alive: true, hitsRemaining: 1 };
}

function makeView(overrides: Partial<AIView> = {}): AIView {
  return {
    visibleEnemyUnits: [makeUnit("king", 0.5, 0.5)],
    allEnemyUnits: [makeUnit("king", 0.5, 0.5)],
    shotHistory: [],
    config: { mode: "ai", difficulty: "easy", rules: { ...C.DEFAULT_RULES }, seed: 1 },
    rng: createRNG(42),
    ...overrides,
  };
}

describe("EasyAI", () => {
  it("returns a position on the AI own half ([0,1]×[0,1])", () => {
    const ai = new EasyAI();
    for (let i = 0; i < 50; i++) {
      const pos = ai.chooseShot({ ...makeView(), rng: createRNG(i) });
      expect(pos.x).toBeGreaterThanOrEqual(0);
      expect(pos.x).toBeLessThanOrEqual(1);
      expect(pos.y).toBeGreaterThanOrEqual(0);
      expect(pos.y).toBeLessThanOrEqual(1);
    }
  });

  it("fires when no enemy units (random fallback)", () => {
    const ai = new EasyAI();
    const pos = ai.chooseShot({ ...makeView(), visibleEnemyUnits: [], rng: createRNG(1) });
    expect(pos.x).toBeGreaterThanOrEqual(0);
    expect(pos.y).toBeGreaterThanOrEqual(0);
  });

  it("shot varies with RNG seed", () => {
    const ai1 = new EasyAI();
    const ai2 = new EasyAI();
    const p1 = ai1.chooseShot({ ...makeView(), rng: createRNG(1) });
    const p2 = ai2.chooseShot({ ...makeView(), rng: createRNG(9999) });
    expect(p1).not.toEqual(p2);
  });
});
