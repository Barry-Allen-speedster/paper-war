import { describe, it, expect } from "vitest";
import { HardAI } from "@lib/ai/hard";
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
    config: { mode: "ai", difficulty: "hard", rules: { ...C.DEFAULT_RULES }, seed: 1 },
    rng: createRNG(99),
  };
}

describe("HardAI", () => {
  it("returns in-bounds position", () => {
    const ai = new HardAI();
    const pos = ai.chooseShot(makeView([makeUnit("king", 0.5, 0.5, "k")]));
    expect(pos.x).toBeGreaterThanOrEqual(0);
    expect(pos.x).toBeLessThanOrEqual(1);
    expect(pos.y).toBeGreaterThanOrEqual(0);
    expect(pos.y).toBeLessThanOrEqual(1);
  });

  it("targets King first when King is alive (aim mirrors king position)", () => {
    const ai = new HardAI();
    const king    = makeUnit("king",    0.8, 0.8, "king");
    const soldier = makeUnit("soldier", 0.2, 0.2, "s1");
    const view = { ...makeView([soldier, king]), rng: createRNG(1) };

    // King is at x=0.8. After fold mirror, AI must aim at x = 1 - 0.8 = 0.2
    // With sigma=8 (≈0.008 normalized), shot should be very close to (0.2, 0.8)
    const pos = ai.chooseShot(view);
    const dist = Math.hypot(pos.x - 0.2, pos.y - 0.8);
    expect(dist).toBeLessThan(0.05);
  });

  it("targets the bomber as a hittable unit when all-units victory is enabled", () => {
    const ai = new HardAI();
    const bomber = makeUnit("bomber", 0.8, 0.8, "b1");
    const king = makeUnit("king", 0.2, 0.2, "k");
    const view = makeView([king, bomber]);
    view.config.rules.allUnitsWin = true;

    const pos = ai.chooseShot(view);
    const dist = Math.hypot(pos.x - 0.2, pos.y - 0.8);
    expect(dist).toBeLessThan(0.05);
  });

  it("prioritizes a bomber with multiple units in its blast radius", () => {
    const ai = new HardAI();
    const bomber = makeUnit("bomber", 0.5, 0.2, "b1");
    const nearby1 = makeUnit("soldier", 0.548, 0.2, "s1");
    const nearby2 = makeUnit("soldier", 0.452, 0.2, "s2");
    const king = makeUnit("king", 0.5, 0.8, "k");

    const pos = ai.chooseShot({ ...makeView([bomber, nearby1, nearby2, king]), rng: createRNG(1) });
    expect(Math.hypot(pos.x - 0.5, pos.y - 0.2)).toBeLessThan(0.05);
  });

  it("fallback to random when no enemy units", () => {
    const ai = new HardAI();
    const pos = ai.chooseShot({ ...makeView([]), rng: createRNG(1) });
    expect(pos.x).toBeGreaterThanOrEqual(0);
    expect(pos.y).toBeGreaterThanOrEqual(0);
  });
});
