"use client";

import clsx from "clsx";
import { ChevronDown } from "lucide-react";

interface CollapseChevronProps {
  isCollapsed: boolean;
  onToggle: () => void;
  ariaLabel: string;
}

export function CollapseChevron({
  isCollapsed,
  onToggle,
  ariaLabel,
}: CollapseChevronProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      onPointerDown={(e) => e.stopPropagation()}
      aria-label={ariaLabel}
      aria-expanded={!isCollapsed}
      className={clsx(
        "-ml-2 flex h-6 w-5 flex-shrink-0 cursor-pointer items-center justify-start rounded-md",
        "text-muted-foreground/60 transition-colors hover:bg-secondary hover:text-foreground",
        "md:ml-0 md:w-6 md:justify-center md:absolute md:-left-7 md:top-1/2 md:-translate-y-1/2",
      )}
    >
      <ChevronDown
        aria-hidden="true"
        strokeWidth={2.25}
        className={clsx(
          "h-4 w-4 transition-transform duration-150",
          isCollapsed && "-rotate-90",
        )}
      />
    </button>
  );
}
