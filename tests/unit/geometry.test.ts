import { describe, it, expect } from "vitest";
import { toRef, fromRef, distance, clamp01, quadrantOf, lerpVec2 } from "@lib/game/geometry";
import { DEFAULT_CONFIG } from "@lib/game/config";

const R = DEFAULT_CONFIG.REF_SIZE;

describe("geometry", () => {
  describe("toRef / fromRef", () => {
    it("toRef multiplies by REF_SIZE", () => {
      expect(toRef({ x: 0.5, y: 0.25 })).toEqual({ x: 500, y: 250 });
    });

    it("fromRef divides by REF_SIZE", () => {
      expect(fromRef({ x: 500, y: 250 })).toEqual({ x: 0.5, y: 0.25 });
    });

    it("round-trips correctly", () => {
      const original = { x: 0.314, y: 0.718 };
      const result = fromRef(toRef(original));
      expect(result.x).toBeCloseTo(original.x, 10);
      expect(result.y).toBeCloseTo(original.y, 10);
    });
  });

  describe("distance", () => {
    it("zero distance for same point", () => {
      expect(distance({ x: 100, y: 100 }, { x: 100, y: 100 })).toBe(0);
    });

    it("3-4-5 right triangle gives 5", () => {
      expect(distance({ x: 0, y: 0 }, { x: 300, y: 400 })).toBeCloseTo(500, 5);
    });

    it("is symmetric", () => {
      const a = { x: 200, y: 300 };
      const b = { x: 450, y: 100 };
      expect(distance(a, b)).toBeCloseTo(distance(b, a), 10);
    });
  });

  describe("clamp01", () => {
    it("clamps values below 0 to 0", () => {
      expect(clamp01({ x: -0.5, y: -1 })).toEqual({ x: 0, y: 0 });
    });

    it("clamps values above 1 to 1", () => {
      expect(clamp01({ x: 1.5, y: 2 })).toEqual({ x: 1, y: 1 });
    });

    it("passes through values in range", () => {
      expect(clamp01({ x: 0.3, y: 0.7 })).toEqual({ x: 0.3, y: 0.7 });
    });

    it("clamps boundary values exactly", () => {
      expect(clamp01({ x: 0, y: 1 })).toEqual({ x: 0, y: 1 });
    });
  });

  describe("quadrantOf", () => {
    it("top-left → 0", () => expect(quadrantOf({ x: 0.1, y: 0.1 })).toBe(0));
    it("top-right → 1", () => expect(quadrantOf({ x: 0.9, y: 0.1 })).toBe(1));
    it("bottom-left → 2", () => expect(quadrantOf({ x: 0.1, y: 0.9 })).toBe(2));
    it("bottom-right → 3", () => expect(quadrantOf({ x: 0.9, y: 0.9 })).toBe(3));
    it("center → bottom-right (x=0.5 not < 0.5)", () => {
      expect(quadrantOf({ x: 0.5, y: 0.5 })).toBe(3);
    });
  });

  describe("lerpVec2", () => {
    it("t=0 returns a", () => {
      expect(lerpVec2({ x: 0, y: 0 }, { x: 100, y: 200 }, 0)).toEqual({ x: 0, y: 0 });
    });
    it("t=1 returns b", () => {
      expect(lerpVec2({ x: 0, y: 0 }, { x: 100, y: 200 }, 1)).toEqual({ x: 100, y: 200 });
    });
    it("t=0.5 returns midpoint", () => {
      expect(lerpVec2({ x: 0, y: 0 }, { x: 100, y: 200 }, 0.5)).toEqual({ x: 50, y: 100 });
    });
  });
});
