---
inclusion: always
---

# Paper War — Project Structure Steering

## Directory Map

```
paper-war/
├── app/                          Next.js App Router routes
│   ├── layout.tsx                Root layout (ThemeProvider, AudioProvider)
│   ├── page.tsx                  / → MainMenu
│   ├── play/
│   │   ├── local/page.tsx        Local Pass & Play
│   │   ├── ai/page.tsx           Vs AI
│   │   └── online/page.tsx       Online host/join
│   └── join/[code]/page.tsx      Guest deep-link entry
│
├── components/                   React UI components (all "use client")
│   ├── menu/                     MainMenu, ThemeSwitcher, RulesPanel, HowToPlayModal
│   ├── lobby/                    GameLobby, RoomCodeDisplay, ConnectionBadge
│   ├── deployment/               UnitDeployment, UnitTray, BoardHalf, UnitGhost
│   ├── battlefield/              BattlefieldScreen, PaperSheet, halves, reticle, fold
│   ├── overlays/                 TurnControllerOverlay, GameOverScreen, PauseMenu
│   ├── ui/                       Button, Modal, Toast, ErrorBoundary, SettingsDrawer
│   └── units/                    Per-theme SVG unit components
│       ├── notebook/
│       ├── blueprint/
│       └── parchment/
│
├── lib/                          Pure, framework-free modules
│   ├── game/                     types, config, reducer, rules, geometry, placement, rng
│   ├── ai/                       types, easy, medium, hard, heatmap
│   ├── net/                      transport interface, peerjs, supabase-stub, protocol, commitment
│   ├── themes/                   ThemeConfig type, index, per-theme configs
│   ├── audio/                    audioService, per-theme sound packs
│   ├── storage/                  localStorage wrapper with versioning
│   └── i18n.ts                   t() translation function
│
├── hooks/                        React hooks (Zustand stores + custom hooks)
│   ├── useGameStore.ts
│   ├── useSettingsStore.ts
│   ├── useNetStore.ts
│   ├── useTheme.ts
│   ├── useAI.ts
│   └── useResizeObserver.ts
│
├── styles/
│   └── globals.css
│
├── tests/
│   ├── unit/                     Vitest unit tests for /lib modules
│   ├── component/                Vitest + RTL component tests
│   └── e2e/                      Playwright end-to-end tests
│
├── public/                       Static assets (textures, fonts)
│
├── .kiro/
│   └── steering/                 product.md, tech.md, structure.md
│
├── spec/                         requirements.md, design.md, tasks.md
├── CREDITS.md
└── README.md
```

## Naming Conventions

| Thing | Convention | Example |
|---|---|---|
| React components | PascalCase `.tsx` | `BattlefieldScreen.tsx` |
| Hooks | camelCase with `use` prefix | `useGameStore.ts` |
| Pure lib modules | camelCase `.ts` | `geometry.ts`, `reducer.ts` |
| Types | PascalCase interfaces/types | `GameState`, `Vec2` |
| Discriminated union keys | `type` field, SCREAMING_SNAKE | `{ type: "FIRE" }` |
| CSS variables | `--pw-` prefix | `--pw-bg-primary`, `--pw-crease-color` |
| Test files | same name + `.test.ts(x)` | `rules.test.ts` |
| E2E files | descriptive + `.spec.ts` | `local-game.spec.ts` |

## Module Rules

1. `/lib` modules import only from other `/lib` modules and `node_modules`. Never from `components/`, `hooks/`, or `app/`.
2. `hooks/` imports from `/lib` and `zustand` only. Never from `components/`.
3. `components/` imports from `hooks/`, `/lib` (types only, no side effects), and other `components/`.
4. `app/` pages import from `components/` only (no direct `/lib` imports in page files).
5. Test files import from the module under test and test utilities only.

## Key Files (Do Not Refactor Without Reason)

- `/lib/game/types.ts` — All core game types. Changes here ripple everywhere.
- `/lib/game/config.ts` — All constants. No magic numbers elsewhere.
- `/lib/game/reducer.ts` — The state machine. Every game transition goes through here.
- `/lib/game/geometry.ts` — The only place for coordinate conversion.
- `/lib/net/transport.ts` — The Transport interface. Swapping the network backend means writing a new implementation of this interface only.
- `/lib/themes/types.ts` — The ThemeConfig type. Adding a field here requires updating all three theme files.
