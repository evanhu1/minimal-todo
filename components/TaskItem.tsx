"use client";

import { useState } from "react";
import clsx from "clsx";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Bell,
  Check,
  ChevronDown,
  GripVertical,
  Repeat,
  Trash2,
} from "lucide-react";

import type { Task } from "@/lib/types";
import { describeRecurrence, occurrenceCompleted } from "@/lib/recurrence";
import { formatReminder, isPast } from "@/lib/util";
import type { TaskHandlers } from "@/components/TodoApp";
import { ScheduleEditor } from "@/components/ScheduleEditor";

export function TaskItem({ task, handlers }: { task: Task; handlers: TaskHandlers }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });
  const [expanded, setExpanded] = useState(false);

  const hasReminder = Boolean(task.scheduledStartIso);
  const hasNotes = task.body.trim().length > 0;

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={clsx(
        "rounded-lg border border-transparent bg-white shadow-sm dark:bg-neutral-900",
        "hover:border-neutral-200 dark:hover:border-neutral-800",
        isDragging && "opacity-60",
      )}
    >
      <div className="flex items-center gap-1 px-2 py-1.5">
        <button
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder"
          className="cursor-grab touch-none p-1 text-neutral-300 hover:text-neutral-500 active:cursor-grabbing"
        >
          <GripVertical className="size-4" />
        </button>

        <button
          onClick={() => handlers.complete(task)}
          aria-label="Mark done"
          className="flex size-5 shrink-0 items-center justify-center rounded-full border border-neutral-300 text-transparent hover:border-green-500 hover:text-green-500 dark:border-neutral-600"
        >
          <Check className="size-3.5" />
        </button>

        <input
          value={task.title}
          onChange={(e) => handlers.setTitle(task.id, e.target.value)}
          aria-label="Task title"
          className="min-w-0 flex-1 bg-transparent px-1 py-1 text-base outline-none"
        />

        {hasReminder && (
          <ReminderBadge task={task} onClick={() => setExpanded((v) => !v)} />
        )}

        <button
          onClick={() => setExpanded((v) => !v)}
          aria-label="Details"
          className={clsx(
            "p-1 text-neutral-300 hover:text-neutral-500",
            (expanded || hasNotes) && "text-neutral-500",
          )}
        >
          <ChevronDown
            className={clsx("size-4 transition-transform", expanded && "rotate-180")}
          />
        </button>
      </div>

      {expanded && (
        <div className="flex flex-col gap-3 border-t border-neutral-100 px-3 py-3 dark:border-neutral-800">
          <textarea
            value={task.body}
            onChange={(e) => handlers.setBody(task.id, e.target.value)}
            placeholder="Notes…"
            rows={3}
            className="w-full resize-y rounded-md bg-neutral-50 p-2 text-sm outline-none ring-1 ring-neutral-200 placeholder:text-neutral-400 focus:ring-neutral-400 dark:bg-neutral-800/50 dark:ring-neutral-700"
          />
          <ScheduleEditor task={task} onChange={handlers.setSchedule} />
          <div className="flex justify-end">
            <button
              onClick={() => handlers.remove(task.id)}
              className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40"
            >
              <Trash2 className="size-3.5" />
              Delete task
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

function ReminderBadge({ task, onClick }: { task: Task; onClick: () => void }) {
  const start = task.scheduledStartIso!;
  const recurring = task.scheduledRecurrence;
  const occDone =
    recurring && occurrenceCompleted(task.completedOccurrenceIso, task.scheduledStartIso);
  const overdue = isPast(start) && !occDone;

  return (
    <button
      onClick={onClick}
      title={
        recurring ? describeRecurrence(recurring, start) : "Scheduled reminder"
      }
      className={clsx(
        "flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs",
        overdue
          ? "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400"
          : "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400",
      )}
    >
      {recurring ? <Repeat className="size-3" /> : <Bell className="size-3" />}
      {formatReminder(start)}
    </button>
  );
}
