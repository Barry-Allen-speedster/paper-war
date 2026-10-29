/**
 * DEFAULT_CONFIG — single source of truth for all game constants.
 * No magic numbers anywhere else in the codebase.
 */
import type { UnitType, RuleConfig } from "./types";

export const DEFAULT_CONFIG = {
  // ─── Board ────────────────────────────────────────────────────────────────
  /** Reference space size (normalized 0..1 × this = reference units) */
  REF_SIZE: 1000,
  /** Minimum distance from any edge in reference units */
  EDGE_MARGIN: 30,
  /** Minimum distance from crease in reference units */
  CREASE_MARGIN: 30,

  // ─── Units ────────────────────────────────────────────────────────────────
  /** Hit radii in reference space */
  HIT_RADIUS: {
    soldier: 18,
    queen: 22,
    king: 26,
  } as Record<UnitType, number>,

  /** Shot dot radius in reference space */
  SHOT_RADIUS: 8,

  /** Extra clearance between unit edges when placing */
  MIN_UNIT_SPACING: 6,

  /** Army composition per player */
  ARMY: {
    soldier: 5,
    queen: 1,
    king: 1,
  } as Record<UnitType, number>,

  // ─── AI ───────────────────────────────────────────────────────────────────
  /** Hard AI heatmap grid dimension (50×50 cells) */
  HARD_AI_GRID: 50,
  /** Prior weight for cells near edges/crease (0..1) */
  HARD_AI_EDGE_WEIGHT: 0.3,
  /** Fraction of half that counts as "edge zone" */
  HARD_AI_EDGE_ZONE: 0.05,
  /** How many near-top cells share the argmax jitter pool */
  HARD_AI_JITTER_COUNT: 5,
  /** Search radius (reference units) for Medium AI hunt mode */
  MEDIUM_AI_HIT_RADIUS_REF: 30,
  /** Turns to hunt after a hit */
  MEDIUM_AI_HIT_TURNS: 2,
  /** Minimum think time in ms */
  AI_THINK_MIN_MS: 700,
  /** Maximum think time in ms */
  AI_THINK_MAX_MS: 1500,

  // ─── Network ──────────────────────────────────────────────────────────────
  MAX_CODE_RETRIES: 5,
  RECONNECT_WINDOW_MS: 30_000,
  REMATCH_TIMEOUT_MS: 15_000,
  PEER_ID_PREFIX: "paperwar-",

  // ─── Animation (ms) ───────────────────────────────────────────────────────
  ANIM_INK_MS: 60,
  ANIM_FOLD_MS: 600,
  ANIM_PRESS_MS: 160,
  ANIM_UNFOLD_MS: 600,
  ANIM_REVEAL_MS: 180,
  ANIM_TOTAL_MS: 1600,

  // ─── Rules defaults ───────────────────────────────────────────────────────
  DEFAULT_RULES: {
    shotsPerTurn: 1,
    queenTakesTwo: false,
    queenKillSkipsTurn: false,
    allUnitsWin: false,
    showUnitsAfterReady: true,
    kingTakesFour: false,
    streakRevive: false,
  } satisfies RuleConfig,

  // ─── Storage ──────────────────────────────────────────────────────────────
  STORAGE_VERSION: 3,
} as const;
