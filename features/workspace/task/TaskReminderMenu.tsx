"use client";

import clsx from "clsx";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { Check, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import type { Task } from "@/lib/workspace/types";
import { formatRelativeFromNow } from "@/features/workspace/lib/task-reminders/reminder-helpers";
import { IconButton } from "@/features/workspace/ui/IconButton";
import { useWorkspaceDispatch } from "@/features/workspace/WorkspaceContext";

interface TaskReminderMenuProps {
  task: Task;
  onClose: () => void;
}

const ABSOLUTE_TIMES: { label: string; hour: number; minute: number }[] = [
  { label: "9:30 AM", hour: 9, minute: 30 },
  { label: "12:00 PM", hour: 12, minute: 0 },
  { label: "6:30 PM", hour: 18, minute: 30 },
  { label: "10:00 PM", hour: 22, minute: 0 },
];

const SHIFT_PRESETS: { label: string; minutes: number }[] = [
  { label: "+10 min", minutes: 10 },
  { label: "+1 hr", minutes: 60 },
  { label: "+3 hrs", minutes: 180 },
  { label: "+1 day", minutes: 60 * 24 },
  { label: "-10 min", minutes: -10 },
  { label: "-1 hr", minutes: -60 },
  { label: "-3 hrs", minutes: -180 },
  { label: "-1 day", minutes: -60 * 24 },
];

function formatLocalDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function dateAtAbsoluteTime(
  date: Date,
  preset: (typeof ABSOLUTE_TIMES)[number],
): Date {
  const next = new Date(date);
  next.setHours(preset.hour, preset.minute, 0, 0);
  return next;
}

function nextAvailableAbsoluteTime(now: Date): Date {
  for (const preset of ABSOLUTE_TIMES) {
    const candidate = dateAtAbsoluteTime(now, preset);
    if (candidate.getTime() > now.getTime()) return candidate;
  }

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return dateAtAbsoluteTime(tomorrow, ABSOLUTE_TIMES[0]);
}

const SUPPORTED_DURATION_MINUTES = [30, 60, 90, 120];
const DEFAULT_DURATION_MINUTES = 30;

function existingDurationMinutes(task: Task): number {
  if (!task.scheduledStartIso || !task.scheduledEndIso) {
    return DEFAULT_DURATION_MINUTES;
  }
  const minutes = Math.round(
    (new Date(task.scheduledEndIso).getTime() -
      new Date(task.scheduledStartIso).getTime()) /
      60_000,
  );
  return SUPPORTED_DURATION_MINUTES.includes(minutes)
    ? minutes
    : DEFAULT_DURATION_MINUTES;
}

function buildInitialDate(task: Task): Date {
  if (task.scheduledStartIso) {
    return new Date(task.scheduledStartIso);
  }
  const now = new Date();
  if (task.scheduledDay) {
    const [y, m, d] = task.scheduledDay.split("-").map(Number);
    const scheduledDay = new Date(y, m - 1, d, 0, 0, 0, 0);
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    if (scheduledDay.getTime() < today.getTime()) {
      return nextAvailableAbsoluteTime(now);
    }
    if (isSameDay(scheduledDay, now)) return nextAvailableAbsoluteTime(now);
    return dateAtAbsoluteTime(scheduledDay, ABSOLUTE_TIMES[0]);
  }
  return nextAvailableAbsoluteTime(now);
}

function formatDateLabel(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function formatTimeLabel(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function TaskReminderMenu({ task, onClose }: TaskReminderMenuProps) {
  const dispatch = useWorkspaceDispatch();

  const [scheduled, setScheduled] = useState<Date>(
    () => buildInitialDate(task),
  );
  const durationMinutes = useMemo(
    () => existingDurationMinutes(task),
    [task],
  );
  const [showCalendar, setShowCalendar] = useState(false);
  const [viewMonth, setViewMonth] = useState<Date>(
    () => startOfMonth(buildInitialDate(task)),
  );

  const selectDay = useCallback((day: Date) => {
    setScheduled((prev) => {
      const next = new Date(day);
      next.setHours(prev.getHours(), prev.getMinutes(), 0, 0);
      return next;
    });
  }, []);

  const setAbsoluteTime = useCallback((hour: number, minute: number) => {
    setScheduled((prev) => {
      const next = new Date(prev);
      next.setHours(hour, minute, 0, 0);
      return next;
    });
  }, []);

  const shiftMinutes = useCallback(
    (delta: number) => {
      setScheduled((prev) => new Date(prev.getTime() + delta * 60_000));
    },
    [],
  );

  const handleRemove = useCallback(() => {
    dispatch({
      type: "clear_task_reminder",
      id: task.id,
      taskListId: task.taskListId,
    });
    onClose();
  }, [dispatch, onClose, task.id, task.taskListId]);

  const handleSubmit = useCallback(() => {
    const scheduledTimeZone =
      Intl.DateTimeFormat().resolvedOptions().timeZone;
    const scheduledDay = formatLocalDateKey(scheduled);
    const scheduledStartIso = scheduled.toISOString();
    const scheduledEndIso = new Date(
      scheduled.getTime() + durationMinutes * 60_000,
    ).toISOString();
    dispatch({
      type: "set_task_reminder",
      id: task.id,
      taskListId: task.taskListId,
      scheduledDay,
      scheduledStartIso,
      scheduledEndIso,
      scheduledTimeZone,
    });
    onClose();
  }, [
    dispatch,
    durationMinutes,
    onClose,
    scheduled,
    task.id,
    task.taskListId,
  ]);

  const dateLabel = formatDateLabel(scheduled);
  const timeLabel = formatTimeLabel(scheduled);
  const relativeLabel = formatRelativeFromNow(scheduled, new Date());

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div
          className="text-[11px] font-semibold uppercase text-muted-foreground"
          style={{ letterSpacing: "0.06em" }}
        >
          Set reminder
        </div>
        <div className="flex items-center gap-1.5">
          <IconButton label="Remove reminder" onClick={handleRemove}>
            <X className="h-3.5 w-3.5" strokeWidth={2} />
          </IconButton>
          <IconButton label="Save" onClick={handleSubmit}>
            <Check className="h-3.5 w-3.5" strokeWidth={2} />
          </IconButton>
        </div>
      </div>
      <button
        type="button"
        onClick={() => setShowCalendar((v) => !v)}
        className={clsx(
          "rounded-md px-2.5 py-1.5 text-left text-xs text-foreground tabular-nums transition-colors",
          showCalendar ? "bg-secondary" : "bg-secondary/60 hover:bg-secondary",
        )}
      >
        {dateLabel}
        {timeLabel ? `, ${timeLabel}` : ""}
        <span className="text-muted-foreground"> {relativeLabel}</span>
      </button>
      {showCalendar ? (
        <CalendarPicker
          viewMonth={viewMonth}
          selected={scheduled}
          onPrevMonth={() => setViewMonth((m) => addMonths(m, -1))}
          onNextMonth={() => setViewMonth((m) => addMonths(m, 1))}
          onSelect={selectDay}
        />
      ) : null}
      <div className="grid grid-cols-4 gap-1">
        {ABSOLUTE_TIMES.map((opt) => (
          <PresetButton
            key={opt.label}
            onClick={() => setAbsoluteTime(opt.hour, opt.minute)}
          >
            {opt.label}
          </PresetButton>
        ))}
        {SHIFT_PRESETS.map((preset) => (
          <PresetButton
            key={preset.label}
            onClick={() => shiftMinutes(preset.minutes)}
          >
            {preset.label}
          </PresetButton>
        ))}
      </div>
    </div>
  );
}

const WEEKDAY_LABELS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

function CalendarPicker({
  viewMonth,
  selected,
  onPrevMonth,
  onNextMonth,
  onSelect,
}: {
  viewMonth: Date;
  selected: Date;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onSelect: (day: Date) => void;
}) {
  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(viewMonth), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(viewMonth), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [viewMonth]);
  const today = new Date();

  return (
    <div className="rounded-md bg-secondary/40 p-2.5">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-xs font-semibold text-foreground">
          {format(viewMonth, "MMMM yyyy")}
        </div>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={onPrevMonth}
            aria-label="Previous month"
            className="flex h-6 w-6 items-center justify-center rounded text-foreground hover:bg-secondary"
          >
            <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={onNextMonth}
            aria-label="Next month"
            className="flex h-6 w-6 items-center justify-center rounded text-foreground hover:bg-secondary"
          >
            <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-[10px] font-medium text-muted-foreground">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="flex h-5 items-center justify-center">
            {label}
          </div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-0.5">
        {days.map((day) => {
          const inMonth = isSameMonth(day, viewMonth);
          const isSelected = isSameDay(day, selected);
          const isToday = isSameDay(day, today);
          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onSelect(day)}
              className={clsx(
                "flex h-7 w-full items-center justify-center rounded-full text-xs tabular-nums transition-colors",
                isSelected
                  ? "bg-accent-orange text-white"
                  : inMonth
                    ? "text-foreground hover:bg-secondary"
                    : "text-muted-foreground/50 hover:bg-secondary",
                !isSelected && isToday && "ring-1 ring-accent-orange/50",
              )}
            >
              {format(day, "d")}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PresetButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-md bg-secondary/60 px-1 py-2 text-xs text-foreground tabular-nums transition-colors hover:bg-secondary disabled:opacity-50"
    >
      {children}
    </button>
  );
}
