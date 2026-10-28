"use client";
/**
 * Returns the active ThemeConfig based on the current settings.
 */
import { useSettingsStore } from "./useSettingsStore";
import { getTheme } from "@lib/themes/index";
import type { ThemeConfig } from "@lib/themes/types";

export function useTheme(): ThemeConfig {
  const themeId = useSettingsStore((s) => s.theme);
  return getTheme(themeId);
}
