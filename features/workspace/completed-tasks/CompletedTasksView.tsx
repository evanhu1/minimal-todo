"use client";

import clsx from "clsx";
import { RotateCcw } from "lucide-react";
import { useMemo } from "react";

import { AppDialogSheet } from "@/features/workspace/ui/AppDialogSheet";
import { IconButton } from "@/features/workspace/ui/IconButton";
import {
  useWorkspaceDispatch,
  useWorkspaceState,
} from "@/features/workspace/WorkspaceContext";
import type { Task } from "@/lib/workspace/types";

interface CompletedTasksViewProps {
  open: boolean;
  onClose: () => void;
  titleId: string;
}

const DAY_LABEL_FORMATTER = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function formatLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function CompletedTasksView({
  open,
  onClose,
  titleId,
}: CompletedTasksViewProps) {
  const { taskLists } = useWorkspaceState();
  const dispatch = useWorkspaceDispatch();

  const groups = useMemo(() => {
    const done: Task[] = [];
    for (const taskList of Object.values(taskLists)) {
      for (const task of Object.values(taskList.tasks)) {
        if (task.status === "done") done.push(task);
      }
    }
    done.sort((a, b) => {
      const aTime = a.completedAt ? new Date(a.completedAt).getTime() : 0;
      const bTime = b.completedAt ? new Date(b.completedAt).getTime() : 0;
      return bTime - aTime;
    });
    return groupByDay(done);
  }, [taskLists]);

  const handleRestore = (task: Task) => {
    dispatch({
      type: "restore_task",
      id: task.id,
      taskListId: task.taskListId,
    });
  };

  return (
    <AppDialogSheet open={open} onClose={onClose} titleId={titleId}>
      <h1
        id={titleId}
        className="mb-8 text-2xl font-medium leading-tight md:text-3xl"
      >
        Completed tasks
      </h1>

      {groups.length === 0 ? (
        <p className="text-muted-foreground">
          You haven&apos;t finished any tasks yet.
        </p>
      ) : (
        <div className="flex flex-col gap-8">
          {groups.map((group) => (
            <section key={group.dateKey}>
              <h2
                className={clsx(
                  "mb-3 text-xs font-semibold uppercase tracking-wide",
                  group.isToday
                    ? "text-muted-foreground"
                    : "text-muted-foreground/60",
                )}
              >
                {group.label}
              </h2>
              <ul className="flex flex-col divide-y divide-border/60 border-y border-border/60">
                {group.tasks.map((task) => (
                  <li
                    key={task.id}
                    className="flex items-center justify-between gap-3 py-2.5"
                  >
                    <span
                      className={clsx(
                        "min-w-0 flex-1 truncate text-sm leading-snug line-through",
                        group.isToday
                          ? "text-muted-foreground"
                          : "text-muted-foreground/70",
                      )}
                    >
                      {task.title || "Untitled task"}
                    </span>
                    <IconButton
                      label="Restore task"
                      onClick={() => handleRestore(task)}
                      className="shrink-0 text-muted-foreground"
                    >
                      <RotateCcw size={14} />
                    </IconButton>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </AppDialogSheet>
  );
}

interface DayGroup {
  dateKey: string;
  label: string;
  isToday: boolean;
  tasks: Task[];
}

function groupByDay(tasks: Task[]): DayGroup[] {
  const todayKey = formatLocalDateKey(new Date());
  const yesterdayKey = formatLocalDateKey(
    new Date(Date.now() - 24 * 60 * 60 * 1000),
  );
  const groups = new Map<string, Task[]>();

  for (const task of tasks) {
    const completedAt = task.completedAt ? new Date(task.completedAt) : new Date(0);
    const key = formatLocalDateKey(completedAt);
    const bucket = groups.get(key);
    if (bucket) {
      bucket.push(task);
    } else {
      groups.set(key, [task]);
    }
  }

  return Array.from(groups.entries()).map(([dateKey, tasksInGroup]) => {
    const isToday = dateKey === todayKey;
    let label: string;
    if (isToday) {
      label = "Today";
    } else if (dateKey === yesterdayKey) {
      label = "Yesterday";
    } else {
      const first = tasksInGroup[0].completedAt
        ? new Date(tasksInGroup[0].completedAt)
        : new Date(0);
      label = DAY_LABEL_FORMATTER.format(first);
    }
    return { dateKey, label, isToday, tasks: tasksInGroup };
  });
}
