---
inclusion: always
---

# Paper War — Product Steering

## What We're Building

Paper War is a 2-player browser game that simulates a tactile paper-folding battle. Players secretly place an army on their half of a "sheet of paper," then take turns firing shots at the opponent's half. A shot is resolved by folding the paper over — the ink presses through to the other side. The last King standing wins.

The entire experience should feel like a physical object: textured, creased, slightly imperfect. The UI is the game's main appeal alongside the strategy.

## Core Player Experience Goals

1. **Tactile delight first.** Every interaction — drag to place, fold animation, ink bleed — should feel satisfying and physical. Performance and visual fidelity are not optional.

2. **Tension and deduction.** The hidden-information mechanic drives the game. Miss marks stay on the board as permanent clues. Players should feel like detectives and gamblers simultaneously.

3. **Zero friction entry.** Local Pass & Play must be playable within 30 seconds of loading the page. No accounts, no downloads.

4. **Faithful online play.** Online mode must be cheat-resistant. Neither player should be able to gain information about the opponent's layout that a physical game wouldn't allow.

## Definition of Done

The product is done when:
- All three modes (Local, Vs AI, Online) are playable start-to-finish on desktop and a 375px phone viewport.
- All three themes (Notebook Sketch, Neon Blueprint, Vintage Parchment) are complete, including their unique hit effects.
- The fold animation plays smoothly and is skippable.
- Online mode works between two browser tabs with commitment verification running correctly.
- All tests pass and the production build succeeds.

## Out of Scope (v1)

- User accounts, leaderboards, or matchmaking.
- More than 2 players.
- More than 3 themes.
- Server-side game logic.
- Native mobile apps.
