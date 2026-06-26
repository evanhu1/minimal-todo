"use client";

import clsx from "clsx";

export function IconButton({
  children,
  onClick,
  disabled,
  label,
  className,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  label: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={clsx(
        "flex h-7 w-7 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:bg-secondary disabled:opacity-50",
        className,
      )}
    >
      {children}
    </button>
  );
}
