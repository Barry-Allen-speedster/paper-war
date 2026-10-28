import { describe, it, expect } from "vitest";
import { MediumAI } from "@lib/ai/medium";
import { createRNG } from "@lib/game/rng";
import { DEFAULT_CONFIG } from "@lib/game/config";
import type { AIView } from "@lib/ai/types";
import type { Unit } from "@lib/game/types";

const C = DEFAULT_CONFIG;

function makeUnit(type: Unit["type"], x: number, y: number, id: string): Unit {
  return { id, type, pos: { x, y }, alive: true, hitsRemaining: 1 };
}

function makeView(units: Unit[]): AIView {
  return {
    visibleEnemyUnits: units,
    allEnemyUnits: units,
    shotHistory: [],
    config: { mode: "ai", difficulty: "medium", rules: { ...C.DEFAULT_RULES }, seed: 1 },
    rng: createRNG(77),
  };
}

describe("MediumAI", () => {
  it("returns in-bounds position", () => {
    const ai = new MediumAI();
    const pos = ai.chooseShot(makeView([makeUnit("king", 0.5, 0.5, "k")]));
    expect(pos.x).toBeGreaterThanOrEqual(0);
    expect(pos.x).toBeLessThanOrEqual(1);
    expect(pos.y).toBeGreaterThanOrEqual(0);
    expect(pos.y).toBeLessThanOrEqual(1);
  });

  it("targets unit closest to crease (lowest y) first", () => {
    const ai = new MediumAI();
    // Two soldiers: one near crease (y=0.1) and one far (y=0.9)
    const nearCrease = makeUnit("soldier", 0.5, 0.1, "s1");
    const farBack    = makeUnit("soldier", 0.5, 0.9, "s2");
    const view = { ...makeView([nearCrease, farBack]), rng: createRNG(1) };

    // Without aim error the shot should be near y=0.1
    // With sigma=30 (normalized ≈ 0.03), very likely still close
    const pos = ai.chooseShot(view);
    expect(pos.y).toBeLessThan(0.5); // closer to crease side
  });

  it("never fires out of bounds", () => {
    const ai = new MediumAI();
    for (let i = 0; i < 20; i++) {
      const pos = ai.chooseShot({
        ...makeView([makeUnit("king", 0.5, 0.5, "k")]),
        rng: createRNG(i),
      });
      expect(pos.x).toBeGreaterThanOrEqual(0);
      expect(pos.x).toBeLessThanOrEqual(1);
      expect(pos.y).toBeGreaterThanOrEqual(0);
      expect(pos.y).toBeLessThanOrEqual(1);
    }
  });
});
