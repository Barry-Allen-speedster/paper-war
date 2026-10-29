import type { ThemeConfig } from "./types";

export const parchmentTheme: ThemeConfig = {
  id: "parchment",
  name: "Vintage Parchment",
  cssVars: {
    "--pw-bg": "#e8d5a3",
    "--pw-surface": "#f0deb4",
    "--pw-text": "#3b2a14",
    "--pw-text-muted": "#7a5c30",
    "--pw-accent": "#8b2500",
    "--pw-crease": "#7a5c30",
    "--pw-hit": "#8b2500",
    "--pw-miss": "#4a6741",
    "--pw-border": "#c4a882",
    "--pw-font": "'IM Fell English', serif",
    // Parchment-specific
    "--pw-ink": "#2a1a08",
    "--pw-stain": "rgba(100, 60, 20, 0.08)",
  },
  backgroundCss: `
    radial-gradient(ellipse at 20% 30%, var(--pw-stain) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 70%, var(--pw-stain) 0%, transparent 40%),
    radial-gradient(ellipse at 50% 50%, transparent 60%, rgba(100,60,20,0.05) 100%)
  `,
  hitEffect: {
    soldier: { animationClass: "pw-splat-small", duration: 500 },
    bomber:  { animationClass: "pw-burnt-hole", duration: 600 },
    queen:   { animationClass: "pw-burnt-hole", duration: 700 },
    king:    { animationClass: "pw-burnt-hole-large", duration: 800 },
  },
  missMark: { shape: "circle", color: "#4a6741", size: 7 },
  shotDot: { color: "#2a1a08", radius: 5, opacity: 0.8 },
  crease: { cssClass: "pw-crease-parchment", width: 4 },
  soundPack: "parchment",
};
