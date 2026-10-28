"use client";
/**
 * FoldAnimationLayer — the signature fold animation.
 * Folds the attacker's half over the crease using CSS 3D transforms driven by
 * Framer Motion's useAnimate. The ink dot placed at (u,v) on own half presses
 * through to (u,v) on the opponent's half.
 *
 * Rumble jitter uses seeded values passed in as props (no Math.random).
 */
import { useEffect, useRef } from "react";
import { useAnimate, useReducedMotion } from "framer-motion";
import { DEFAULT_CONFIG } from "@lib/game/config";

const C = DEFAULT_CONFIG;

interface Props {
  trigger: boolean;
  heavyHit: number;       // 0..1 — scales rumble amplitude
  onComplete: () => void;
  side: "left" | "right" | "top" | "bottom"; // attacker's half position
  halfRef: React.RefObject<HTMLDivElement | null>;
  boardRef: React.RefObject<HTMLDivElement | null>;
  /** Seeded jitter values so we never call Math.random() */
  jitter: { rx: number; ry: number; rr: number };
}

export function FoldAnimationLayer({
  trigger,
  heavyHit,
  onComplete,
  side,
  halfRef,
  boardRef,
  jitter,
}: Props) {
  const prefersReduced = useReducedMotion();
  const [, animate] = useAnimate();
  const hasRun = useRef(false);
  const completedRef = useRef(false);

  useEffect(() => {
    // Reset when trigger goes false
    if (!trigger) {
      hasRun.current = false;
      completedRef.current = false;
      return;
    }

    if (hasRun.current) return;
    hasRun.current = true;

    const half = halfRef.current;
    const board = boardRef.current;
    if (!half || !board) { onComplete(); return; }

    if (prefersReduced) {
      void animate(half, { opacity: [1, 0.4, 1] }, { duration: 0.25 }).then(() => {
        if (!completedRef.current) { completedRef.current = true; onComplete(); }
      });
      return;
    }

    // Set the fold pivot to the crease edge
    const origins: Record<string, string> = {
      left:   "right center",
      right:  "left center",
      top:    "center bottom",
      bottom: "center top",
    };
    half.style.transformOrigin = origins[side] ?? "right center";
    half.style.transformStyle = "preserve-3d";
    half.style.backfaceVisibility = "hidden";

    const rumble = heavyHit;
    const rx = jitter.rx * 6 * rumble;
    const ry = jitter.ry * 6 * rumble;
    const rr = jitter.rr * 2 * rumble;

    const isVertical = side === "top" || side === "bottom";

    async function sequence() {
      // Phase 1: brief pause while ink dot is "inked" on own half
      await new Promise<void>((r) => setTimeout(r, C.ANIM_INK_MS));

      // Phase 2: fold — rotate 180° about the crease
      await animate(
        half!,
        isVertical
          ? { rotateX: -180 }
          : { rotateY: side === "left" ? -180 : 180 },
        { duration: C.ANIM_FOLD_MS / 1000, ease: [0.4, 0, 0.2, 1] }
      );

      // Phase 3: press + camera rumble
      await Promise.all([
        animate(board!, { scale: [1, 0.97, 1] }, { duration: C.ANIM_PRESS_MS / 1000 }),
        animate(
          board!,
          { x: [0, rx, -rx * 0.5, 0], y: [0, ry, -ry * 0.5, 0], rotate: [0, rr, -rr * 0.5, 0] },
          { duration: C.ANIM_PRESS_MS / 1000 }
        ),
      ]);

      // Phase 4: unfold
      await animate(
        half!,
        isVertical ? { rotateX: 0 } : { rotateY: 0 },
        { duration: C.ANIM_UNFOLD_MS / 1000, ease: [0.4, 0, 0.2, 1] }
      );

      // Phase 5: brief pause for ink bleed-in on opponent half
      await new Promise<void>((r) => setTimeout(r, C.ANIM_REVEAL_MS));

      // Reset inline transforms
      half!.style.transform = "";
      board!.style.transform = "";

      if (!completedRef.current) { completedRef.current = true; onComplete(); }
    }

    void sequence().catch(() => {
      if (!completedRef.current) { completedRef.current = true; onComplete(); }
    });
  // Only re-run when trigger changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);

  return null;
}
