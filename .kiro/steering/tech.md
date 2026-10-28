---
inclusion: always
---

# Paper War — Technical Steering

## Stack

- **Framework:** Next.js (App Router) + TypeScript strict mode, React 18+
- **Styling:** Tailwind CSS + CSS custom properties for theming
- **Animation:** Framer Motion (fold animation, overlays)
- **State:** Zustand (GameStore, SettingsStore, NetStore — three separate stores)
- **Validation:** Zod (all network messages, localStorage deserialization)
- **Icons:** Lucide React
- **Networking:** PeerJS (default), behind a swappable `Transport` interface
- **Testing:** Vitest + React Testing Library (unit + component), Playwright (E2E)
- **Deploy:** Vercel (no server required for core play)

## Non-Negotiable Rules

### 1. Normalized Coordinates
All unit positions and shot positions are stored as **normalized Vec2** with both axes in `[0, 1]` relative to the player's half. Conversion to pixels happens **only at render time** in CSS/JSX. Hit detection, placement validation, and AI logic all use the 1000×1000 reference space (multiply normalized by `DEFAULT_CONFIG.REF_SIZE`).

**Do not store pixel values in GameState. Do not do hit detection in pixels.**

The conversion functions are `toRef(v: Vec2): Vec2` and `fromRef(v: Vec2): Vec2` in `/lib/game/geometry.ts` and are the only place this conversion happens.

### 2. Pure Logic in /lib
Everything in `/lib` must be:
- Framework-free (no React, no Next.js, no DOM access)
- Pure functions or pure classes where possible
- Unit-testable with Vitest in a Node/jsdom environment without any browser APIs

Game logic, AI, networking protocol, commitment, geometry, placement — all live in `/lib`. If you need React to run a function, the function is in the wrong place.

### 3. No `any`
TypeScript strict mode is enforced. `any` is banned. Use `unknown` + Zod parsing for external data. Use proper discriminated unions for actions and messages.

### 4. Single Config File
All game constants (radii, margins, army composition, AI parameters, animation durations, network timeouts) live in `/lib/game/config.ts` as `DEFAULT_CONFIG`. No magic numbers anywhere else in the codebase.

### 5. All Text Through `t()`
No raw string literals in JSX. All user-visible text must go through the `t(key)` translation function from `/lib/i18n.ts`. Even if only English is supported, this keeps the codebase i18n-ready.

### 6. Client Components Are Wrappers
The App Router page files are server components that import client-component wrappers. All game UI is `"use client"`. Pure game logic in `/lib` is never imported by a server component.

### 7. GPU-Only Animation
Framer Motion animations and CSS animations must only touch `transform` and `opacity`. No `width`, `height`, `top`, `left`, or any layout-triggering property in animations.

### 8. Seeded RNG Everywhere
`Math.random()` is banned in game logic and AI. Use the seeded `RNG` instance from `/lib/game/rng.ts`. Pass the `rng` instance explicitly. This makes games reproducible and tests deterministic.

## Testing Approach

- Logic tests (geometry, rules, reducer, AI, commitment) run in Vitest with no DOM.
- Component tests run in Vitest with jsdom + React Testing Library.
- One Playwright E2E test covers the local game smoke path.
- Never mock game logic in component tests — use real reducer and real rules.
- Audio service is mockable; mock it in all component tests.
- Network transport is mockable; mock it in all component and integration tests.

## Performance Targets

- Initial JS bundle < 200KB gzipped.
- 60fps on mid-range Android during fold animation.
- Lighthouse mobile performance ≥ 90.
- Theme assets and audio are lazy-loaded, not bundled in the initial chunk.
