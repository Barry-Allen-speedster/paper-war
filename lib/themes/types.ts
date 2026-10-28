/**
 * ThemeConfig — the contract every theme must implement.
 * Adding a theme = implementing this interface + registering in index.ts.
 */
import type { UnitType } from "../game/types";

export type ThemeId = "notebook" | "blueprint" | "parchment";

export interface CSSVars {
  "--pw-bg": string;
  "--pw-surface": string;
  "--pw-text": string;
  "--pw-text-muted": string;
  "--pw-accent": string;
  "--pw-crease": string;
  "--pw-hit": string;
  "--pw-miss": string;
  "--pw-border": string;
  "--pw-font": string;
  [key: string]: string; // allow theme-specific extras
}

export interface HitEffectConfig {
  /** CSS animation class name applied to the hit unit */
  animationClass: string;
  /** Duration in ms */
  duration: number;
  /** For Blueprint: particle count */
  particleCount?: number;
}

export interface MissMarkConfig {
  /** SVG shape: "dot" | "x" | "circle" */
  shape: "dot" | "x" | "circle";
  color: string;
  size: number; // px in reference space
}

export interface ShotDotConfig {
  color: string;
  radius: number; // reference space
  opacity: number;
}

export interface CreaseConfig {
  /** CSS class applied to the crease element */
  cssClass: string;
  width: number; // px
}

export type SoundPackId = "notebook" | "blueprint" | "parchment";

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  /** CSS variable map injected into :root */
  cssVars: CSSVars;
  /** Background CSS (gradient, pattern) applied to the paper sheet */
  backgroundCss: string;
  /** Hit effect configuration */
  hitEffect: Record<UnitType, HitEffectConfig>;
  /** Miss mark style */
  missMark: MissMarkConfig;
  /** Shot dot style */
  shotDot: ShotDotConfig;
  /** Crease style */
  crease: CreaseConfig;
  /** Sound pack to use */
  soundPack: SoundPackId;
}
