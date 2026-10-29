/**
 * Hard AI — rule-aware, precise (sigma=6), relentless.
 *
 * Strategy adapts completely to active rules:
 *
 * Default (allUnitsWin OFF):
 *   → Primary: King. Ignores everyone else unless King needs multiple hits.
 *   → If queenKillSkipsTurn: shoot Queen FIRST to steal opponent's next turn,
 *     then immediately pivot to King.
 *   → Multi-hit King (kingTakesFour): keep targeting King every turn — no distractions.
 *
 * allUnitsWin ON:
 *   → Efficient sweep: pick the unit with fewest hitsRemaining (nearest to death),
 *     breaking ties by: soldiers > queen > king (clear chaff first, king last).
 *   → If queenKillSkipsTurn: kill Queen early to deny opponent turns, speeds up sweep.
 *
 * Cluster shots: always check if aiming slightly off-target would hit 2+ units.
 * If a cluster shot exists that hits the priority target AND another unit, prefer it.
 *
 * The AI is designed to feel oppressive on Hard — it will win fast.
 */
import type { Vec2, Unit, RuleConfig } from "../game/types";
import type { AIStrategy, AIView } from "./types";
import { idealAimPos, applyAimError, countOverlap } from "./aimError";

const HARD_SIGMA = 6;
const CLUSTER_SAMPLES = 50;

export class HardAI implements AIStrategy {
  private queenKilledThisTurn = false;

  chooseShot(view: AIView): Vec2 {
    const { visibleEnemyUnits, rng, config } = view;
    const rules = config.rules;

    if (visibleEnemyUnits.length === 0) return { x: rng.next(), y: rng.next() };

    const target = this.pickTarget(visibleEnemyUnits, rules);
    if (!target) return { x: rng.next(), y: rng.next() };

    // Try to find a cluster shot that hits the priority target AND bonus units
    const clusterShot = this.findClusterShot(target, visibleEnemyUnits, rng);
    return applyAimError(clusterShot, HARD_SIGMA, rng);
  }

  private pickTarget(units: Unit[], rules: RuleConfig): Unit | null {
    if (units.length === 0) return null;

    const king = units.find((u) => u.type === "king");
    const queen = units.find((u) => u.type === "queen");
    const soldiers = units.filter((u) => u.type === "soldier");

    if (rules.allUnitsWin) {
      // Must kill ALL units. Prioritize by hitsRemaining (fewest first = fastest kill).
      // Among equal hitsRemaining: soldiers > queen > king (kill easiest first).
      // Exception: if queenKillSkipsTurn, queen jumps to front when it's ≤2 hits away.
      if (rules.queenKillSkipsTurn && queen && queen.hitsRemaining <= 2) {
        return queen;
      }

      const sorted = [...units].sort((a, b) => {
        if (a.hitsRemaining !== b.hitsRemaining) return a.hitsRemaining - b.hitsRemaining;
        // Tiebreak by type priority: soldier=0, queen=1, king=2
        const priority = { soldier: 0, queen: 1, king: 2 } as const;
        return priority[a.type] - priority[b.type];
      });
      return sorted[0] ?? null;
    }

    // Default: winning = killing the King
    // If queenKillSkipsTurn active and queen is alive: kill queen first (steal turn),
    // then king has to survive a full extra turn without firing back.
    if (rules.queenKillSkipsTurn && queen && !this.queenKilledThisTurn) {
      this.queenKilledThisTurn = true; // commit to this plan
      return queen;
    }

    // King is the primary target — always
    if (king) return king;

    // King somehow not visible — fallback
    if (queen) return queen;
    if (soldiers.length > 0) return soldiers[0]!;
    return units[0]!;
  }

  private findClusterShot(
    primaryTarget: Unit,
    allUnits: Unit[],
    rng: import("../game/rng").RNG
  ): Vec2 {
    const baseAim = idealAimPos(primaryTarget);

    // Always hits the primary target at sigma=0; try to also hit neighbours
    let bestAim = baseAim;
    let bestScore = 1; // primary target counts as 1

    for (let i = 0; i < CLUSTER_SAMPLES; i++) {
      // Sample near the primary with slightly larger sigma to find cluster opportunities
      const candidate = applyAimError(baseAim, HARD_SIGMA * 3, rng);
      // Landing position after fold mirror
      const landing = { x: 1 - candidate.x, y: candidate.y };

      // Score = number of units hit, with heavy weight for the primary target
      const overlap = countOverlap(landing, allUnits);
      // Require the primary target is still hit (within combined radius)
      const primaryRadius = 0.034 + 0.008; // king/soldier/queen approx normalized
      const dx = landing.x - primaryTarget.pos.x;
      const dy = landing.y - primaryTarget.pos.y;
      const hitsPrimary = (dx * dx + dy * dy) < (primaryRadius * primaryRadius * 4);

      if (hitsPrimary && overlap > bestScore) {
        bestScore = overlap;
        bestAim = candidate;
      }
    }

    return bestAim;
  }
}
