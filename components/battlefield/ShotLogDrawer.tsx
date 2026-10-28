"use client";
import { useState } from "react";
import type { Shot } from "@lib/game/types";
import { t } from "@lib/i18n";

interface Props {
  shots: Shot[];
}

export function ShotLogDrawer({ shots }: Props) {
  const [open, setOpen] = useState(false);

  function shotLabel(s: Shot): string {
    if (s.result === "kill") return t("battle.log.kill", { turn: s.turn, unit: s.killedUnitType ?? "" });
    if (s.result === "hit")  return t("battle.log.hit",  { turn: s.turn, unit: s.hitUnitId ?? "" });
    if (s.result === "waste") return t("battle.log.waste", { turn: s.turn });
    return t("battle.log.miss", { turn: s.turn });
  }

  const resultColor: Record<string, string> = {
    kill:  "text-red-500 font-bold",
    hit:   "text-orange-400",
    miss:  "text-[var(--pw-text-muted)]",
    waste: "text-[var(--pw-text-muted)] italic",
  };

  return (
    <div className="absolute right-0 top-0 bottom-0 z-30 flex">
      {/* Toggle tab */}
      <button
        onClick={() => setOpen((p) => !p)}
        aria-expanded={open}
        aria-label={t("battle.log.title")}
        className="self-center bg-[var(--pw-surface)] border border-[var(--pw-border)] rounded-l-lg px-2 py-4 text-xs writing-mode-vertical shadow"
        style={{ writingMode: "vertical-rl" }}
      >
        {t("battle.log.title")} ({shots.length})
      </button>

      {/* Drawer */}
      {open && (
        <div className="w-56 h-full bg-[var(--pw-surface)] border-l border-[var(--pw-border)] shadow-xl overflow-y-auto p-3">
          <h3 className="font-semibold text-sm mb-3">{t("battle.log.title")}</h3>
          {shots.length === 0 && (
            <p className="text-xs text-[var(--pw-text-muted)]">No shots yet.</p>
          )}
          <ol className="flex flex-col gap-1">
            {[...shots].reverse().map((s) => (
              <li key={s.id} className={`text-xs ${resultColor[s.result] ?? ""}`}>
                {shotLabel(s)}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
