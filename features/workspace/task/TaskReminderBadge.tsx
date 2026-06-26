"use client";

import * as Popover from "@radix-ui/react-popover";
import clsx from "clsx";
import { addDays, startOfWeek } from "date-fns";
import { AlarmClock, CalendarPlus } from "lucide-react";
import { useMemo, useState } from "react";

import type { Task } from "@/lib/workspace/types";
import { useNowTicker } from "@/features/workspace/hooks/useNowTicker";
import {
  formatDayOfWeek,
  formatRelativeFromNow,
} from "@/features/workspace/lib/task-reminders/reminder-helpers";

import { TaskReminderMenu } from "./TaskReminderMenu";

interface TaskReminderBadgeProps {
  task: Task;
}

interface BadgeDisplay {
  label: string;
  past: boolean;
}

function formatLocalDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatTime(date: Date): string {
  return date
    .toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    .replace(/\s/g, "")
    .toLowerCase();
}

function formatTodayTimedLabel(start: Date, now: Date): string {
  const diffMs = start.getTime() - now.getTime();
  if (diffMs >= 60 * 60_000) return formatTime(start);
  if (diffMs >= 0) {
    const minutes = Math.round(diffMs / 60_000);
    if (minutes < 1) return "now";
    return `in ${minutes} ${minutes === 1 ? "min" : "mins"}`;
  }
  return formatRelativeFromNow(start, now);
}

function parseLocalDateKey(dateKey: string): Date {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatDayDistance(target: Date, now: Date): string {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const targetDay = new Date(target);
  targetDay.setHours(0, 0, 0, 0);
  const days = Math.round(
    (targetDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (days === 1) return "in 1 day";
  return `in ${days} days`;
}

function buildDisplay(task: Task, now: Date): BadgeDisplay | null {
  if (!task.scheduledDay || !task.scheduledStartIso) return null;
  const todayKey = formatLocalDateKey(now);
  const isToday = task.scheduledDay === todayKey;
  const nextWeekStartKey = formatLocalDateKey(
    addDays(startOfWeek(now, { weekStartsOn: 0 }), 7),
  );
  const dayDate = parseLocalDateKey(task.scheduledDay);
  if (task.scheduledDay >= nextWeekStartKey) {
    return {
      label: formatDayDistance(dayDate, now),
      past: false,
    };
  }
  const start = new Date(task.scheduledStartIso);
  const time = formatTime(start);
  const past = start.getTime() < now.getTime();
  if (isToday) {
    return { label: formatTodayTimedLabel(start, now), past };
  }
  return { label: `${formatDayOfWeek(task.scheduledDay)}, ${time}`, past };
}

export function TaskReminderBadge({ task }: TaskReminderBadgeProps) {
  const [open, setOpen] = useState(false);
  const now = useNowTicker();
  const display = useMemo(
    // `now` is null until mount; render the placeholder branch until then so
    // SSR and the first client paint match (no time-derived label on either).
    () => (now ? buildDisplay(task, now) : null),
    [task, now],
  );

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        {display ? (
          <button
            type="button"
            className={clsx(
              "inline-flex shrink-0 items-center gap-1 text-xs leading-none tabular-nums transition-colors",
              display.past
                ? "text-yellow-500 hover:text-yellow-400"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <AlarmClock
              aria-hidden="true"
              className="h-3.5 w-3.5 shrink-0"
              strokeWidth={2}
            />
            {display.label}
          </button>
        ) : (
          <button
            type="button"
            aria-label="Set reminder"
            className={clsx(
              "hidden h-[30px] w-[30px] shrink-0 cursor-pointer items-center justify-center rounded-full leading-none text-muted-foreground transition-opacity hover:bg-secondary hover:text-foreground md:flex md:h-[26px] md:w-[26px]",
              open
                ? "opacity-100"
                : "opacity-0 pointer-events-none group-hover/task:opacity-100 group-hover/task:pointer-events-auto focus-visible:opacity-100 focus-visible:pointer-events-auto",
            )}
          >
            <CalendarPlus
              aria-hidden="true"
              strokeWidth={2}
              size={16}
            />
          </button>
        )}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="bottom"
          align="end"
          sideOffset={6}
          className="z-20 w-[320px] rounded-xl border border-border bg-popover p-3 text-popover-foreground shadow-lg"
        >
          <TaskReminderMenu task={task} onClose={() => setOpen(false)} />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
