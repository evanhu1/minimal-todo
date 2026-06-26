"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import clsx from "clsx";
import { useEffect, useRef, useState } from "react";

import type { Task } from "@/lib/workspace/types";
import type { DragData } from "@/features/workspace/drag/types";
import { TaskBlock } from "@/features/workspace/task/TaskBlock";

interface TaskListBodyProps {
  taskListId: string;
  taskOrder: string[];
  tasks: Record<string, Task>;
  onAddTask: (title?: string) => void;
}

export function TaskListBody({
  taskListId,
  taskOrder,
  tasks,
  onAddTask,
}: TaskListBodyProps) {
  const taskCount = taskOrder.length;
  const isEmpty = taskCount === 0;
  const [isPending, setIsPending] = useState(false);
  const pendingInputRef = useRef<HTMLInputElement>(null);
  const {
    isOver: isTaskDropzoneOver,
    setNodeRef: setTaskDropzoneNodeRef,
  } = useDroppable({
    id: `task-list-dropzone:${taskListId}`,
    data: { type: "task-dropzone", taskListId } satisfies DragData,
  });

  useEffect(() => {
    if (isPending) {
      pendingInputRef.current?.focus();
    }
  }, [isPending]);

  const handleAddTaskClick = () => {
    setIsPending(true);
  };

  const handlePendingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.length > 0) {
      setIsPending(false);
      onAddTask(value);
    }
  };

  const handlePendingKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      setIsPending(false);
    } else if (e.key === "Tab") {
      setIsPending(false);
    } else if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      // Submit on Enter, mirroring the list-title input: create the task (an
      // empty title yields a focused empty row) and close the pending input.
      // Skip while an IME composition is active so confirming a candidate with
      // Enter doesn't prematurely submit.
      e.preventDefault();
      const value = e.currentTarget.value;
      setIsPending(false);
      onAddTask(value.length > 0 ? value : undefined);
    }
  };

  const handlePendingBlur = () => {
    setIsPending(false);
  };

  return (
    <div ref={isEmpty ? setTaskDropzoneNodeRef : undefined}>
      <SortableContext
        items={taskOrder}
        strategy={verticalListSortingStrategy}
      >
        <div
          className={clsx(
            "relative flex flex-col rounded-2xl transition-all md:gap-0",
            isEmpty ? (isTaskDropzoneOver ? "min-h-10" : "min-h-0") : "min-h-8",
            isTaskDropzoneOver ? "bg-secondary/70" : "bg-transparent",
          )}
        >
          {taskOrder.map((id) => {
            const row = tasks[id];
            if (!row) {
              return null;
            }
            return <TaskBlock key={id} task={row} />;
          })}
        </div>
      </SortableContext>

      {isPending && (
        <div className="mt-1 flex items-start gap-3 pt-0.5 md:gap-4 md:px-3 md:pt-0">
          <span
            aria-hidden="true"
            className="mt-[4px] flex h-4 w-4 flex-shrink-0 items-center justify-center self-start rounded-[3px] border border-muted-foreground/20"
          />
          <input
            ref={pendingInputRef}
            type="text"
            placeholder="Add task"
            className="block min-w-0 flex-1 border-0 bg-transparent p-0 text-base font-normal leading-snug text-foreground outline-none placeholder:text-muted-foreground/40 focus:outline-none focus:ring-0"
            onChange={handlePendingChange}
            onKeyDown={handlePendingKeyDown}
            onBlur={handlePendingBlur}
          />
        </div>
      )}

      <div
        className={clsx(
          "mt-1 w-full",
          !isEmpty && "md:hidden",
          isPending && "hidden",
        )}
      >
        <button
          type="button"
          onClick={handleAddTaskClick}
          aria-label="Add task"
          className="group flex w-full items-start gap-3 pt-0.5 text-left md:gap-4 md:px-3 md:pt-0"
        >
          <span
            aria-hidden="true"
            className="mt-[4px] flex h-4 w-4 flex-shrink-0 items-center justify-center self-start rounded-[3px] border border-muted-foreground/20 transition-colors group-hover:border-muted-foreground/40"
          />
          <span className="text-base font-normal leading-snug text-muted-foreground/40 transition-colors group-hover:text-muted-foreground/60">
            Add task
          </span>
        </button>
      </div>
    </div>
  );
}
