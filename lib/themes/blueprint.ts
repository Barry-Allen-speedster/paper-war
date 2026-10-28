import type { ThemeConfig } from "./types";

export const blueprintTheme: ThemeConfig = {
  id: "blueprint",
  name: "Neon Blueprint",
  cssVars: {
    "--pw-bg": "#0a0e1a",
    "--pw-surface": "#0d1426",
    "--pw-text": "#00e5ff",
    "--pw-text-muted": "#4db8cc",
    "--pw-accent": "#00e5ff",
    "--pw-crease": "#00e5ff",
    "--pw-hit": "#ff3355",
    "--pw-miss": "#00e5ff",
    "--pw-border": "#1a2a4a",
    "--pw-font": "'Share Tech Mono', monospace",
    // Blueprint-specific
    "--pw-grid-color": "rgba(0, 180, 220, 0.15)",
    "--pw-glow": "0 0 8px rgba(0, 229, 255, 0.6)",
  },
  backgroundCss: `
    repeating-linear-gradient(
      0deg,
      var(--pw-grid-color) 0px,
      var(--pw-grid-color) 1px,
      transparent 1px,
      transparent 40px
    ),
    repeating-linear-gradient(
      90deg,
      var(--pw-grid-color) 0px,
      var(--pw-grid-color) 1px,
      transparent 1px,
      transparent 40px
    )
  `,
  hitEffect: {
    soldier: { animationClass: "pw-particle-burst-small", duration: 500, particleCount: 20 },
    queen:   { animationClass: "pw-particle-burst-large", duration: 600, particleCount: 35 },
    king:    { animationClass: "pw-particle-burst-large", duration: 700, particleCount: 40 },
  },
  missMark: { shape: "x", color: "#00e5ff", size: 8 },
  shotDot: { color: "#00e5ff", radius: 5, opacity: 0.9 },
  crease: { cssClass: "pw-crease-blueprint", width: 2 },
  soundPack: "blueprint",
};
