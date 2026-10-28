/**
 * Theme registry — add new themes here.
 */
import type { ThemeId, ThemeConfig } from "./types";
import { notebookTheme } from "./notebook";
import { blueprintTheme } from "./blueprint";
import { parchmentTheme } from "./parchment";

export const THEMES: Record<ThemeId, ThemeConfig> = {
  notebook: notebookTheme,
  blueprint: blueprintTheme,
  parchment: parchmentTheme,
};

export const THEME_IDS: ThemeId[] = ["notebook", "blueprint", "parchment"];

export function getTheme(id: ThemeId): ThemeConfig {
  return THEMES[id];
}

export type { ThemeId, ThemeConfig } from "./types";
