"use client";
/**
 * Injects the active theme's CSS variables onto :root.
 * Wrap the entire app in this component.
 */
import { useEffect } from "react";
import { useSettingsStore } from "@hooks/useSettingsStore";
import { getTheme } from "@lib/themes/index";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const themeId = useSettingsStore((s) => s.theme);

  useEffect(() => {
    const theme = getTheme(themeId);
    const root = document.documentElement;
    for (const [key, value] of Object.entries(theme.cssVars)) {
      root.style.setProperty(key, value);
    }
  }, [themeId]);

  return <>{children}</>;
}
