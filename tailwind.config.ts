import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // CSS-variable-driven theme colors
        "pw-bg": "var(--pw-bg)",
        "pw-surface": "var(--pw-surface)",
        "pw-text": "var(--pw-text)",
        "pw-accent": "var(--pw-accent)",
        "pw-crease": "var(--pw-crease)",
        "pw-hit": "var(--pw-hit)",
        "pw-miss": "var(--pw-miss)",
      },
      fontFamily: {
        game: ["var(--pw-font)", "system-ui", "sans-serif"],
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "slide-up": {
          from: { transform: "translateY(8px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.2s ease-out",
        "slide-up": "slide-up 0.25s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
