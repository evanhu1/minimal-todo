"use client";

import clsx from "clsx";
import { AlignLeft, ChevronRight } from "lucide-react";

import type { Task } from "@/lib/workspace/types";

import { hasRichTextContent } from "@/lib/workspace/rich-text";

export function TaskRightActions({
  task,
  onOpenNotes,
}: {
  task: Task;
  onOpenNotes: () => void;
}) {
  const hasNotes = hasRichTextContent(task.body);
  const buttonAriaLabel = `Open notes for ${task.title}`;

  return (
    <div className="flex flex-shrink-0 items-center gap-1">
      <div
        className={clsx(
          "relative flex items-center gap-0.5 transition-opacity",
          hasNotes
            ? "text-muted-foreground opacity-100"
            : "opacity-100 md:pointer-events-none md:opacity-0 md:group-hover/task:pointer-events-auto md:group-hover/task:opacity-100",
        )}
      >
        <button
          type="button"
          onClick={onOpenNotes}
          aria-label={buttonAriaLabel}
          className="-mr-2 flex h-7 w-7 cursor-pointer items-center justify-center gap-0.5 rounded-full leading-none text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground md:mr-0"
        >
          {hasNotes ? (
            <AlignLeft
              aria-hidden="true"
              strokeWidth={2}
              size={16}
            />
          ) : (
            <ChevronRight
              aria-hidden="true"
              strokeWidth={2}
              size={18}
            />
          )}
        </button>
      </div>
    </div>
  );
}
