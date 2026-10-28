"use client";
import type { Unit, UnitType } from "@lib/game/types";
import { t } from "@lib/i18n";

interface Props {
  unplacedUnits: Unit[];
  selectedUnitId: string | null;
  onSelect: (id: string) => void;
}

const unitEmoji: Record<UnitType, string> = {
  soldier: "🗡",
  queen: "♛",
  king: "♔",
};

const unitLabel: Record<UnitType, string> = {
  soldier: "deploy.unit.soldier",
  queen:   "deploy.unit.queen",
  king:    "deploy.unit.king",
};

export function UnitTray({ unplacedUnits, selectedUnitId, onSelect }: Props) {
  if (unplacedUnits.length === 0) {
    return (
      <div className="text-center text-sm text-[var(--pw-text-muted)] py-2">
        All units placed!
      </div>
    );
  }

  return (
    <div role="list" aria-label={t("deploy.tray.label")} className="flex flex-wrap gap-2 justify-center">
      {unplacedUnits.map((unit) => (
        <button
          key={unit.id}
          onClick={() => onSelect(unit.id)}
          aria-label={t(unitLabel[unit.type])}
          aria-pressed={selectedUnitId === unit.id}
          className={[
            "w-12 h-12 rounded-lg border-2 flex items-center justify-center text-xl transition-all",
            selectedUnitId === unit.id
              ? "border-[var(--pw-accent)] scale-110 bg-[var(--pw-accent)]/10"
              : "border-[var(--pw-border)] hover:border-[var(--pw-accent)]",
          ].join(" ")}
        >
          {unitEmoji[unit.type]}
        </button>
      ))}
    </div>
  );
}
