import type { ThemeConfig } from "./types";

export const notebookTheme: ThemeConfig = {
  id: "notebook",
  name: "Notebook Sketch",
  cssVars: {
    "--pw-bg": "#f8f7f2",
    "--pw-surface": "#ffffff",
    "--pw-text": "#1a1a2e",
    "--pw-text-muted": "#555577",
    "--pw-accent": "#2244cc",
    "--pw-crease": "#cc3333",
    "--pw-hit": "#cc2200",
    "--pw-miss": "#336699",
    "--pw-border": "#c8c4b8",
    "--pw-font": "'Caveat', cursive",
    // Notebook-specific
    "--pw-rule-color": "#9bb8d4",
    "--pw-margin-color": "#ff9999",
  },
  backgroundCss: `
    repeating-linear-gradient(
      transparent,
      transparent 27px,
      var(--pw-rule-color) 27px,
      var(--pw-rule-color) 28px
    ),
    linear-gradient(
      90deg,
      transparent 48px,
      var(--pw-margin-color) 48px,
      var(--pw-margin-color) 50px,
      transparent 50px
    )
  `,
  hitEffect: {
    soldier: { animationClass: "pw-scribble-small", duration: 400 },
    queen:   { animationClass: "pw-scribble-large", duration: 500 },
    king:    { animationClass: "pw-scribble-large", duration: 600 },
  },
  missMark: { shape: "dot", color: "#336699", size: 6 },
  shotDot: { color: "#1a1a2e", radius: 5, opacity: 0.85 },
  crease: { cssClass: "pw-crease-notebook", width: 3 },
  soundPack: "notebook",
};
