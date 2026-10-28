"use client";
import type { Shot } from "@lib/game/types";
import { useTheme } from "@hooks/useTheme";
import { DEFAULT_CONFIG } from "@lib/game/config";
import { t } from "@lib/i18n";

interface Props {
  shot: Shot;
  halfWidth: number;
  halfHeight: number;
}

const C = DEFAULT_CONFIG;

export function ShotMark({ shot, halfWidth, halfHeight }: Props) {
  const theme = useTheme();
  const cx = shot.pos.x * halfWidth;
  const cy = shot.pos.y * halfHeight;

  const isHit = shot.result === "hit" || shot.result === "kill";
  const isMiss = shot.result === "miss";
  const isWaste = shot.result === "waste";

  const dotRadiusPx = (C.SHOT_RADIUS / C.REF_SIZE) * Math.min(halfWidth, halfHeight);
  const missSize = (theme.missMark.size / C.REF_SIZE) * Math.min(halfWidth, halfHeight);

  const label = isHit
    ? t("battle.log.hit", { unit: shot.killedUnitType ?? "", turn: shot.turn })
    : isMiss
    ? t("battle.log.miss", { turn: shot.turn })
    : t("battle.log.waste", { turn: shot.turn });

  return (
    <g role="img" aria-label={label}>
      {isHit && (
        <circle
          cx={cx}
          cy={cy}
          r={dotRadiusPx * 1.4}
          fill="var(--pw-hit)"
          opacity={0.85}
        />
      )}
      {isMiss && theme.missMark.shape === "dot" && (
        <circle
          cx={cx}
          cy={cy}
          r={missSize * 0.5}
          fill={theme.missMark.color}
          opacity={0.7}
        />
      )}
      {isMiss && theme.missMark.shape === "x" && (
        <g stroke={theme.missMark.color} strokeWidth={2} opacity={0.8}>
          <line x1={cx - missSize} y1={cy - missSize} x2={cx + missSize} y2={cy + missSize} />
          <line x1={cx + missSize} y1={cy - missSize} x2={cx - missSize} y2={cy + missSize} />
        </g>
      )}
      {isMiss && theme.missMark.shape === "circle" && (
        <circle
          cx={cx}
          cy={cy}
          r={missSize}
          fill="none"
          stroke={theme.missMark.color}
          strokeWidth={1.5}
          opacity={0.7}
        />
      )}
      {isWaste && (
        <circle
          cx={cx}
          cy={cy}
          r={dotRadiusPx}
          fill="none"
          stroke="var(--pw-text-muted)"
          strokeWidth={1}
          strokeDasharray="2 2"
          opacity={0.5}
        />
      )}
    </g>
  );
}
