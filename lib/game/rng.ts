/**
 * Seeded pseudo-random number generator (mulberry32).
 * Use this everywhere randomness is needed in game logic.
 * Math.random() is banned in /lib.
 */

export interface RNG {
  /** Returns a float in [0, 1) */
  next(): number;
  /** Returns an integer in [min, max] inclusive */
  nextInt(min: number, max: number): number;
  /** Returns a float in [min, max) */
  nextFloat(min: number, max: number): number;
}

/** Creates a seeded RNG using the mulberry32 algorithm. */
export function createRNG(seed: number): RNG {
  let s = seed >>> 0; // ensure 32-bit unsigned

  function next(): number {
    s += 0x6d2b79f5;
    let z = s;
    z = Math.imul(z ^ (z >>> 15), z | 1);
    z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
    z = (z ^ (z >>> 14)) >>> 0;
    return z / 0x100000000;
  }

  function nextInt(min: number, max: number): number {
    return Math.floor(next() * (max - min + 1)) + min;
  }

  function nextFloat(min: number, max: number): number {
    return next() * (max - min) + min;
  }

  return { next, nextInt, nextFloat };
}
