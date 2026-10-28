"use client";

interface Props {
  targetX: number;
  targetY: number;
  halfWidth: number;
  halfHeight: number;
  backgroundCss: string;
}

const LOUPE_SIZE = 80;
const LOUPE_OFFSET_Y = 70; // above the finger
const ZOOM = 2.5;

export function MagnifierLoupe({ targetX, targetY, halfWidth, halfHeight, backgroundCss }: Props) {
  const loupeLeft = Math.max(LOUPE_SIZE / 2, Math.min(halfWidth - LOUPE_SIZE / 2, targetX)) - LOUPE_SIZE / 2;
  const loupeTop = Math.max(0, targetY - LOUPE_OFFSET_Y - LOUPE_SIZE);

  // The background-position offsets to center the loupe on the target
  const bgX = -(targetX * ZOOM - LOUPE_SIZE / 2);
  const bgY = -(targetY * ZOOM - LOUPE_SIZE / 2);

  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        left: loupeLeft,
        top: loupeTop,
        width: LOUPE_SIZE,
        height: LOUPE_SIZE,
        borderRadius: "50%",
        border: "2px solid var(--pw-accent)",
        boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
        overflow: "hidden",
        pointerEvents: "none",
        zIndex: 20,
      }}
    >
      {/* Zoomed background */}
      <div
        style={{
          position: "absolute",
          width: halfWidth * ZOOM,
          height: halfHeight * ZOOM,
          left: bgX,
          top: bgY,
          background: backgroundCss,
          backgroundSize: `${halfWidth * ZOOM}px ${halfHeight * ZOOM}px`,
        }}
      />
      {/* Crosshair */}
      <svg
        width={LOUPE_SIZE}
        height={LOUPE_SIZE}
        style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
      >
        <line x1={LOUPE_SIZE/2 - 6} y1={LOUPE_SIZE/2} x2={LOUPE_SIZE/2 + 6} y2={LOUPE_SIZE/2}
          stroke="var(--pw-accent)" strokeWidth={1.5} />
        <line x1={LOUPE_SIZE/2} y1={LOUPE_SIZE/2 - 6} x2={LOUPE_SIZE/2} y2={LOUPE_SIZE/2 + 6}
          stroke="var(--pw-accent)" strokeWidth={1.5} />
      </svg>
    </div>
  );
}
