"use client";
import { useNetStore } from "@hooks/useNetStore";
import { t } from "@lib/i18n";

const statusConfig = {
  disconnected: { label: "—", color: "bg-gray-400" },
  connecting:   { label: "menu.connecting", color: "bg-yellow-400 animate-pulse" },
  connected:    { label: "lobby.connected", color: "bg-green-500" },
  reconnecting: { label: "lobby.reconnecting", color: "bg-orange-400 animate-pulse" },
} as const;

export function ConnectionBadge() {
  const status = useNetStore((s) => s.connectionStatus);
  const cfg = statusConfig[status];
  const label = cfg.label === "—" ? "—" : t(cfg.label);

  return (
    <div className="flex items-center gap-2 text-sm text-[var(--pw-text-muted)]">
      <span className={`w-2 h-2 rounded-full ${cfg.color}`} aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
