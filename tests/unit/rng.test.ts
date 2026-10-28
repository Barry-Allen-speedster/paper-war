import { describe, it, expect } from "vitest";
import { createRNG } from "@lib/game/rng";

describe("RNG (mulberry32)", () => {
  it("produces values in [0, 1)", () => {
    const rng = createRNG(42);
    for (let i = 0; i < 1000; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("same seed → same sequence", () => {
    const a = createRNG(12345);
    const b = createRNG(12345);
    for (let i = 0; i < 20; i++) {
      expect(a.next()).toBe(b.next());
    }
  });

  it("different seeds → different sequences", () => {
    const a = createRNG(1);
    const b = createRNG(2);
    const seqA = Array.from({ length: 10 }, () => a.next());
    const seqB = Array.from({ length: 10 }, () => b.next());
    expect(seqA).not.toEqual(seqB);
  });

  it("nextInt returns integers in [min, max]", () => {
    const rng = createRNG(99);
    for (let i = 0; i < 500; i++) {
      const v = rng.nextInt(3, 7);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(7);
      expect(Number.isInteger(v)).toBe(true);
    }
  });

  it("nextFloat returns values in [min, max)", () => {
    const rng = createRNG(7);
    for (let i = 0; i < 500; i++) {
      const v = rng.nextFloat(10, 20);
      expect(v).toBeGreaterThanOrEqual(10);
      expect(v).toBeLessThan(20);
    }
  });
});
