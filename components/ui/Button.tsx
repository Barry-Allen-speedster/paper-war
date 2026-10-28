"use client";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children: ReactNode;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-[var(--pw-accent)] text-white hover:opacity-90 active:opacity-80 focus-visible:ring-2 focus-visible:ring-[var(--pw-accent)]",
  secondary:
    "bg-[var(--pw-surface)] text-[var(--pw-text)] border border-[var(--pw-border)] hover:bg-[var(--pw-bg)] active:opacity-80",
  ghost:
    "bg-transparent text-[var(--pw-text)] hover:bg-[var(--pw-bg)] active:opacity-80",
  danger:
    "bg-red-600 text-white hover:bg-red-700 active:opacity-80 focus-visible:ring-2 focus-visible:ring-red-500",
};

export function Button({
  variant = "primary",
  children,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled}
      className={[
        // Minimum 44px tap target
        "min-h-[44px] min-w-[44px] px-4 py-2 rounded-md font-medium",
        "transition-opacity duration-100",
        "focus-visible:outline-none focus-visible:ring-offset-1",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        variantClasses[variant],
        className,
      ].join(" ")}
    >
      {children}
    </button>
  );
}
