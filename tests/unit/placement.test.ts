import { describe, it, expect } from "vitest";
import { isValidPlacement, validateArmy, buildArmy, randomPlacement } from "@lib/game/placement";
import { DEFAULT_CONFIG } from "@lib/game/config";
import { createRNG } from "@lib/game/rng";
import type { Unit } from "@lib/game/types";

const C = DEFAULT_CONFIG;

function makeUnit(type: Unit["type"], x: number, y: number, id = "test"): Unit {
  return { id, type, pos: { x, y }, alive: true, hitsRemaining: 1 };
}

describe("placement", () => {
  it("builds the selected soldier count and optional bomber", () => {
    const army = buildArmy("p1", { soldierCount: 8, bomberEnabled: true });
    expect(army.filter((unit) => unit.type === "soldier")).toHaveLength(8);
    expect(army.filter((unit) => unit.type === "bomber")).toHaveLength(1);
  });

  describe("isValidPlacement", () => {
    it("valid placement in safe zone passes", () => {
      const unit = makeUnit("soldier", 0.5, 0.5);
      expect(isValidPlacement(unit, []).valid).toBe(true);
    });

    it("too close to left edge fails", () => {
      const radiusNorm = C.HIT_RADIUS.soldier / C.REF_SIZE;
      const marginNorm = (C.EDGE_MARGIN + C.HIT_RADIUS.soldier - 1) / C.REF_SIZE;
      const unit = makeUnit("soldier", marginNorm, 0.5);
      expect(isValidPlacement(unit, []).valid).toBe(false);
    });

    it("too close to crease (y near 0) fails", () => {
      const unit = makeUnit("soldier", 0.5, 0.001);
      expect(isValidPlacement(unit, []).valid).toBe(false);
    });

    it("too close to right edge fails", () => {
      const unit = makeUnit("soldier", 0.999, 0.5);
      expect(isValidPlacement(unit, []).valid).toBe(false);
    });

    it("too close to bottom edge fails", () => {
      const unit = makeUnit("soldier", 0.5, 0.999);
      expect(isValidPlacement(unit, []).valid).toBe(false);
    });

    it("overlapping with another unit fails", () => {
      const existing = makeUnit("soldier", 0.5, 0.5, "other");
      const unit = makeUnit("soldier", 0.501, 0.501, "new");
      expect(isValidPlacement(unit, [existing]).valid).toBe(false);
    });

    it("unit does not overlap with itself", () => {
      const unit = makeUnit("soldier", 0.5, 0.5, "self");
      expect(isValidPlacement(unit, [unit]).valid).toBe(true);
    });

    it("unit far enough from another passes", () => {
      const existing = makeUnit("king", 0.2, 0.2, "k1");
      const minDist = (C.HIT_RADIUS.king + C.HIT_RADIUS.soldier + C.MIN_UNIT_SPACING + 5) / C.REF_SIZE;
      const unit = makeUnit("soldier", 0.2 + minDist, 0.2, "s1");
      expect(isValidPlacement(unit, [existing]).valid).toBe(true);
    });
  });

  describe("validateArmy", () => {
    it("army from randomPlacement is valid", () => {
      const rng = createRNG(1);
      const army = buildArmy("p1");
      const placed = randomPlacement(army, rng);
      expect(validateArmy(placed).valid).toBe(true);
    });

    it("army with overlapping units is invalid", () => {
      const army = buildArmy("p1");
      const samePos = army.map((u) => ({ ...u, pos: { x: 0.5, y: 0.5 } }));
      expect(validateArmy(samePos).valid).toBe(false);
    });
  });

  describe("randomPlacement", () => {
    it("produces 7 units", () => {
      const rng = createRNG(42);
      const army = buildArmy("p1");
      const placed = randomPlacement(army, rng);
      expect(placed).toHaveLength(7);
    });

    it("all positions in valid range [0,1]", () => {
      const rng = createRNG(77);
      const army = buildArmy("p1");
      const placed = randomPlacement(army, rng);
      for (const u of placed) {
        expect(u.pos.x).toBeGreaterThanOrEqual(0);
        expect(u.pos.x).toBeLessThanOrEqual(1);
        expect(u.pos.y).toBeGreaterThanOrEqual(0);
        expect(u.pos.y).toBeLessThanOrEqual(1);
      }
    });

    it("is deterministic with same seed", () => {
      const army1 = buildArmy("p1");
      const army2 = buildArmy("p1");
      const placed1 = randomPlacement(army1, createRNG(123));
      const placed2 = randomPlacement(army2, createRNG(123));
      expect(placed1.map((u) => u.pos)).toEqual(placed2.map((u) => u.pos));
    });

    it("different seeds produce different layouts", () => {
      const placed1 = randomPlacement(buildArmy("p1"), createRNG(1));
      const placed2 = randomPlacement(buildArmy("p1"), createRNG(9999));
      const same = placed1.every((u, i) =>
        u.pos.x === placed2[i]?.pos.x && u.pos.y === placed2[i]?.pos.y
      );
      expect(same).toBe(false);
    });
  });
});
