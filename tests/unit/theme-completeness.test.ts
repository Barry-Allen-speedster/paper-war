import { describe, it, expect } from "vitest";
import { THEMES, THEME_IDS } from "@lib/themes/index";
import type { ThemeConfig, CSSVars } from "@lib/themes/types";

const REQUIRED_CSS_VARS: (keyof CSSVars)[] = [
  "--pw-bg",
  "--pw-surface",
  "--pw-text",
  "--pw-text-muted",
  "--pw-accent",
  "--pw-crease",
  "--pw-hit",
  "--pw-miss",
  "--pw-border",
  "--pw-font",
];

const UNIT_TYPES = ["soldier", "queen", "king"] as const;

describe("theme completeness", () => {
  for (const id of THEME_IDS) {
    describe(`Theme: ${id}`, () => {
      const theme: ThemeConfig = THEMES[id];

      it("has id and name", () => {
        expect(theme.id).toBe(id);
        expect(typeof theme.name).toBe("string");
        expect(theme.name.length).toBeGreaterThan(0);
      });

      it("has all required CSS variables", () => {
        for (const varName of REQUIRED_CSS_VARS) {
          expect(theme.cssVars[varName], `Missing CSS var: ${varName}`).toBeTruthy();
        }
      });

      it("has backgroundCss string", () => {
        expect(typeof theme.backgroundCss).toBe("string");
        expect(theme.backgroundCss.length).toBeGreaterThan(0);
      });

      it("has hitEffect for all unit types", () => {
        for (const type of UNIT_TYPES) {
          const effect = theme.hitEffect[type];
          expect(effect, `Missing hitEffect for ${type}`).toBeDefined();
          expect(typeof effect.animationClass).toBe("string");
          expect(effect.duration).toBeGreaterThan(0);
        }
      });

      it("has valid missMark", () => {
        const { missMark } = theme;
        expect(["dot", "x", "circle"]).toContain(missMark.shape);
        expect(typeof missMark.color).toBe("string");
        expect(missMark.size).toBeGreaterThan(0);
      });

      it("has valid shotDot", () => {
        const { shotDot } = theme;
        expect(typeof shotDot.color).toBe("string");
        expect(shotDot.radius).toBeGreaterThan(0);
        expect(shotDot.opacity).toBeGreaterThan(0);
        expect(shotDot.opacity).toBeLessThanOrEqual(1);
      });

      it("has valid crease config", () => {
        expect(typeof theme.crease.cssClass).toBe("string");
        expect(theme.crease.width).toBeGreaterThan(0);
      });

      it("has a sound pack id", () => {
        expect(["notebook", "blueprint", "parchment"]).toContain(theme.soundPack);
      });
    });
  }
});
