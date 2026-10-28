# Paper War

A two-player paper-folding battle game. Players secretly place armies on their half of a sheet of paper, then take turns firing ink dots. The paper folds — pressing ink through to the other side. Last King standing wins.

## Quick Start

```bash
npm install
npm run dev
# Open http://localhost:3000
```

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Production build |
| `npm run start` | Serve production build |
| `npm run lint` | ESLint check |
| `npm run typecheck` | TypeScript strict check (no emit) |
| `npm run test` | Vitest unit + component tests (single run) |
| `npm run test:watch` | Vitest in watch mode |
| `npm run test:e2e` | Playwright E2E smoke test (requires running server) |

## Architecture Overview

```
app/          Next.js App Router routes (thin wrappers, all game UI is client-side)
components/   React components ("use client") — menu, lobby, deployment, battlefield, overlays
lib/          Pure, framework-free modules — game logic, AI, network, themes, audio, storage
hooks/        Zustand stores + custom React hooks
styles/       Global CSS + theme animation keyframes
tests/        Unit (Vitest), component (RTL), E2E (Playwright)
spec/         requirements.md, design.md, tasks.md (full spec)
.kiro/        Kiro steering files (product, tech, structure)
```

### Key Design Decisions

- **Normalized coordinates**: All unit/shot positions are `Vec2` in `[0,1]` relative to each player's half. Pixel conversion happens only at render time. Hit detection and AI run in a 1000×1000 reference space.
- **Pure `/lib`**: All game logic (`reducer`, `rules`, `placement`, `geometry`, AI) has zero framework dependencies and is unit-testable with Vitest in Node.
- **Single config file**: Every magic number (radii, margins, timeouts, army size) lives in `lib/game/config.ts`. No constants anywhere else.
- **Swappable transport**: Online play uses PeerJS behind a `Transport` interface. Swap without touching game logic.

## How to Add a Theme

1. Create `lib/themes/[name].ts` implementing `ThemeConfig` (see `lib/themes/types.ts`).
2. Add SVG unit components in `components/units/[name]/` — one file each for `Soldier`, `Queen`, `King`.
3. Create `lib/audio/packs/[name].ts` for sound pack IDs (can reuse another pack).
4. Register in `lib/themes/index.ts`:
   ```ts
   import { myTheme } from "./[name]";
   export const THEMES = { ..., [name]: myTheme };
   export const THEME_IDS = [..., "[name]"];
   ```
5. Add theme-specific CSS animations to `styles/globals.css` if needed.
6. Run `npm run test` — the theme-completeness test will verify all fields are present.

## How to Swap the Network Transport

The `Transport` interface (`lib/net/transport.ts`) requires 5 methods: `connect`, `send`, `onMessage`, `onStatus`, `disconnect`.

1. Create a class implementing `Transport` in `lib/net/`.
2. In `hooks/useNetStore.ts`, replace `new PeerJSTransport()` with your implementation.
3. See `lib/net/supabase-stub.ts` for the Supabase Realtime implementation guide (10 lines of code).

## Vercel Deploy

1. Push to a GitHub repo.
2. Import into Vercel — no configuration needed (Next.js auto-detected).
3. No environment variables required for core play (PeerJS uses their cloud for signaling).
4. For custom PeerJS server: set `NEXT_PUBLIC_PEER_HOST`, `NEXT_PUBLIC_PEER_PORT`, `NEXT_PUBLIC_PEER_PATH` and update `lib/net/peerjs.ts` to use them.

## Game Rules (Defaults)

- **Army**: 5 Soldiers, 1 Queen, 1 King per player
- **Hit radii** (1000px reference space): Soldier 18, Queen 22, King 26; Shot dot 8
- **Win**: Destroy the enemy King
- **Optional rules**: Queen takes 2 hits · Queen hit reveals King quadrant · 1–3 shots per turn · Win by eliminating all units

All defaults are in `lib/game/config.ts`.

## Credits

See [CREDITS.md](./CREDITS.md).
