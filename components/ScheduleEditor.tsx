"use client";

import { X } from "lucide-react";

import { RECURRENCE_FREQS, type RecurrenceFreq, type Task, type TaskRecurrence } from "@/lib/types";
import { isoToLocalInput, localInputToIso } from "@/lib/util";

export function ScheduleEditor({
  task,
  onChange,
}: {
  task: Task;
  onChange: (id: string, startIso: string | null, recurrence: TaskRecurrence | null) => void;
}) {
  const startIso = task.scheduledStartIso;
  const freq = task.scheduledRecurrence?.freq ?? "none";

  function handleDate(value: string) {
    const iso = localInputToIso(value);
    onChange(task.id, iso, iso ? task.scheduledRecurrence : null);
  }

  function handleFreq(value: string) {
    const recurrence: TaskRecurrence | null =
      value === "none" ? null : { freq: value as RecurrenceFreq };
    onChange(task.id, startIso, recurrence);
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <input
        type="datetime-local"
        value={isoToLocalInput(startIso)}
        onChange={(e) => handleDate(e.target.value)}
        aria-label="Reminder time"
        className="rounded-md bg-neutral-50 px-2 py-1 text-sm outline-none ring-1 ring-neutral-200 focus:ring-neutral-400 dark:bg-neutral-800/50 dark:ring-neutral-700"
      />

      <select
        value={freq}
        onChange={(e) => handleFreq(e.target.value)}
        disabled={!startIso}
        aria-label="Repeat"
        className="rounded-md bg-neutral-50 px-2 py-1 text-sm capitalize outline-none ring-1 ring-neutral-200 focus:ring-neutral-400 disabled:opacity-50 dark:bg-neutral-800/50 dark:ring-neutral-700"
      >
        <option value="none">Does not repeat</option>
        {RECURRENCE_FREQS.map((f) => (
          <option key={f} value={f} className="capitalize">
            {f}
          </option>
        ))}
      </select>

      {startIso && (
        <button
          onClick={() => onChange(task.id, null, null)}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-neutral-400 hover:text-neutral-600"
        >
          <X className="size-3.5" />
          Clear
        </button>
      )}
    </div>
  );
}
