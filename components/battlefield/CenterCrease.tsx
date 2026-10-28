"use client";
import { useTheme } from "@hooks/useTheme";

interface Props {
  orientation: "horizontal" | "vertical";
}

export function CenterCrease({ orientation }: Props) {
  const theme = useTheme();

  const isHoriz = orientation === "horizontal";

  return (
    <div
      aria-hidden="true"
      className={[
        "absolute z-10 pointer-events-none",
        theme.crease.cssClass,
        isHoriz
          ? "left-0 right-0 top-1/2 -translate-y-1/2"
          : "top-0 bottom-0 left-1/2 -translate-x-1/2",
      ].join(" ")}
      style={
        isHoriz
          ? { height: theme.crease.width }
          : { width: theme.crease.width }
      }
    />
  );
}
