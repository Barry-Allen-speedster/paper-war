/**
 * Geometry utilities for Paper War.
 *
 * ALL hit detection and placement validation operate in 1000×1000 reference space.
 * Conversion to/from normalized (0..1) coordinates happens ONLY here.
 * Pixel values are never used outside of CSS/JSX render code.
 */
import type { Vec2 } from "./types";
import { DEFAULT_CONFIG } from "./config";

const R = DEFAULT_CONFIG.REF_SIZE;

/** Convert normalized Vec2 (0..1) → reference space Vec2 (0..1000) */
export function toRef(v: Vec2): Vec2 {
  return { x: v.x * R, y: v.y * R };
}

/** Convert reference space Vec2 (0..1000) → normalized Vec2 (0..1) */
export function fromRef(v: Vec2): Vec2 {
  return { x: v.x / R, y: v.y / R };
}

/** Euclidean distance between two points IN REFERENCE SPACE. */
export function distance(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Clamp both axes of a normalized Vec2 to [0, 1]. */
export function clamp01(v: Vec2): Vec2 {
  return {
    x: Math.max(0, Math.min(1, v.x)),
    y: Math.max(0, Math.min(1, v.y)),
  };
}

/** Linear interpolation between two Vec2 values. t ∈ [0, 1]. */
export function lerpVec2(a: Vec2, b: Vec2, t: number): Vec2 {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  };
}

/**
 * Return the quadrant (0=TL, 1=TR, 2=BL, 3=BR) of a normalized position
 * within a player's half.
 */
export function quadrantOf(pos: Vec2): 0 | 1 | 2 | 3 {
  const left = pos.x < 0.5;
  const top = pos.y < 0.5;
  if (top && left) return 0;
  if (top && !left) return 1;
  if (!top && left) return 2;
  return 3;
}

/** Add two Vec2 values (component-wise). */
export function addVec2(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

/** Subtract b from a (component-wise). */
export function subVec2(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

/** Scale a Vec2 by a scalar. */
export function scaleVec2(v: Vec2, s: number): Vec2 {
  return { x: v.x * s, y: v.y * s };
}
