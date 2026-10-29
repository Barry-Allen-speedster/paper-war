"use client";
import { useSettingsStore } from "@hooks/useSettingsStore";

export function RulesPanel() {
  const { rules, setRules } = useSettingsStore();

  return (
    <div className="flex flex-col gap-4">
      <h3 className="font-bold text-sm uppercase tracking-wide text-[var(--pw-text-muted)]">
        Rules
      </h3>

      {/* ── Shots per turn ──────────────────────────────────────────────── */}
      <div>
        <p className="text-sm font-medium mb-2">Shots per turn</p>
        <p className="text-xs text-[var(--pw-text-muted)] mb-2">
          How many times you fire before the turn passes.
        </p>
        <div className="flex gap-2">
          {[1, 2, 3].map((n) => (
            <button
              key={n}
              onClick={() => setRules({ shotsPerTurn: n })}
              className={[
                "flex-1 py-2 rounded-lg text-sm font-bold border-2 transition-all",
                rules.shotsPerTurn === n
                  ? "bg-[var(--pw-accent)] text-white border-[var(--pw-accent)] scale-105"
                  : "border-[var(--pw-border)] hover:border-[var(--pw-accent)] text-[var(--pw-text)]",
              ].join(" ")}
            >
              {n} shot{n > 1 ? "s" : ""}
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-[var(--pw-border)]" />

      {/* ── Army size ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Soldiers per player</p>
          <p className="text-xs text-[var(--pw-text-muted)]">Choose between 5 and 10 regular soldiers.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Remove one soldier"
            disabled={rules.soldierCount <= 5}
            onClick={() => setRules({ soldierCount: Math.max(5, rules.soldierCount - 1) })}
            className="w-8 h-8 rounded border border-[var(--pw-border)] disabled:opacity-40"
          >−</button>
          <span className="min-w-7 text-center font-bold">{rules.soldierCount}</span>
          <button
            type="button"
            aria-label="Add one soldier"
            disabled={rules.soldierCount >= 10}
            onClick={() => setRules({ soldierCount: Math.min(10, rules.soldierCount + 1) })}
            className="w-8 h-8 rounded border border-[var(--pw-border)] disabled:opacity-40"
          >+</button>
        </div>
      </div>

      <div className="border-t border-[var(--pw-border)]" />

      {/* ── Toggle rules ─────────────────────────────────────────────────── */}
      {([
        {
          key: "bomberEnabled" as const,
          label: "Add one bomber soldier",
          desc: "Adds one bomber to each army. It has a larger target circle, explodes when destroyed, and gives one randomly timed wide blast shot during your first four shots if it survives.",
        },
        {
          key: "queenTakesTwo" as const,
          label: "Queen takes 2 hits",
          desc: "The Queen survives the first hit — you need to land two shots to kill her.",
        },
        {
          key: "queenKillSkipsTurn" as const,
          label: "Queen kill skips opponent\u2019s turn",
          desc: "If you kill the enemy Queen, your opponent loses their next turn entirely.",
        },
        {
          key: "allUnitsWin" as const,
          label: "Win by eliminating all units",
          desc: "Killing the King alone is not enough — you must destroy every single enemy unit to win.",
        },
        {
          key: "kingTakesFour" as const,
          label: "King takes 4 hits",
          desc: "The King is armoured — it takes 4 direct hits to kill him instead of 1.",
        },
        {
          key: "streakRevive" as const,
          label: "Streak revival",
          desc: "Kill 3 enemy soldiers in a row without missing and revive one of your own dead soldiers (Queen must be alive).",
        },
      ]).map(({ key, label, desc }) => (
        <label
          key={key}
          className="flex items-start gap-3 cursor-pointer group"
          onClick={() => setRules({ [key]: !rules[key] })}
        >
          {/* Custom checkbox */}
          <div
            className={[
              "mt-0.5 w-5 h-5 flex-shrink-0 rounded border-2 flex items-center justify-center transition-all",
              rules[key]
                ? "bg-[var(--pw-accent)] border-[var(--pw-accent)]"
                : "border-[var(--pw-border)] group-hover:border-[var(--pw-accent)]",
            ].join(" ")}
          >
            {rules[key] && (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
          <div>
            <p className="text-sm font-medium leading-tight">{label}</p>
            <p className="text-xs text-[var(--pw-text-muted)] mt-0.5">{desc}</p>
          </div>
        </label>
      ))}

      {/* Active rules summary */}
      {(rules.soldierCount > 5 || rules.bomberEnabled || rules.queenTakesTwo || rules.queenKillSkipsTurn || rules.allUnitsWin || rules.shotsPerTurn > 1 || rules.kingTakesFour || rules.streakRevive) && (
        <div className="mt-1 p-2 rounded-lg bg-[var(--pw-accent)]/10 border border-[var(--pw-accent)]/30">
          <p className="text-xs font-semibold text-[var(--pw-accent)] mb-1">Active rules:</p>
          <ul className="text-xs text-[var(--pw-text)] space-y-0.5">
            {rules.shotsPerTurn > 1 && <li>• {rules.shotsPerTurn} shots per turn</li>}
            {rules.soldierCount > 5 && <li>• {rules.soldierCount} soldiers per player</li>}
            {rules.bomberEnabled && <li>• One bomber per player</li>}
            {rules.queenTakesTwo && <li>• Queen requires 2 hits</li>}
            {rules.queenKillSkipsTurn && <li>• Queen kill skips opponent&apos;s turn</li>}
            {rules.allUnitsWin && <li>• Must destroy all units to win</li>}
            {rules.kingTakesFour && <li>• King requires 4 hits</li>}
            {rules.streakRevive && <li>• 3 soldier kills in a row = revive one soldier</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
