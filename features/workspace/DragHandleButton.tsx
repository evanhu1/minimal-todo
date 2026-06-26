"use client";

import clsx from "clsx";
import { GripVertical } from "lucide-react";
import { forwardRef, type ButtonHTMLAttributes } from "react";

interface DragHandleButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  hiddenClassName?: string;
  isVisible?: boolean;
  visibleClassName?: string;
}

export const DragHandleButton = forwardRef<HTMLButtonElement, DragHandleButtonProps>(
  function DragHandleButton(
    {
      className,
      hiddenClassName = "md:hidden",
      isVisible = true,
      type = "button",
      visibleClassName = "md:flex",
      ...props
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        className={clsx(
          "h-6 w-4 cursor-grab touch-none items-center justify-center rounded-sm text-muted-foreground outline-none transition-colors hover:bg-secondary hover:text-foreground active:cursor-grabbing focus:outline-none focus-visible:outline-none [WebkitTapHighlightColor:transparent]",
          isVisible ? visibleClassName : hiddenClassName,
          className,
        )}
        {...props}
      >
        <GripVertical size={16} />
      </button>
    );
  },
);

DragHandleButton.displayName = "DragHandleButton";
