// The entire data model. One flat list of tasks plus an explicit order array.
// No task lists, no owner, no workspace, no multiplayer — this is a single
// person's todo list, held entirely in their browser.

export type TaskStatus = "active" | "done";

export const RECURRENCE_FREQS = [
  "daily",
  "weekdays",
  "weekly",
  "monthly",
] as const;

export type RecurrenceFreq = (typeof RECURRENCE_FREQS)[number];

/**
 * A standing repeat cadence. The wall-clock time, weekday (weekly), and
 * day-of-month (monthly) all derive from the task's `scheduledStartIso` anchor,
 * so the rule itself only needs the frequency and an optional end date.
 */
export interface TaskRecurrence {
  freq: RecurrenceFreq;
  /** Optional last local date (YYYY-MM-DD, inclusive) the series may fire on. */
  until?: string;
}

export interface Task {
  id: string;
  title: string;
  /** Free-text notes (plain text / markdown). */
  body: string;
  status: TaskStatus;
  /** ISO instant the task was completed, or null while active. */
  completedAt: string | null;
  /** ISO instant of the next/first reminder, or null for an unscheduled task. */
  scheduledStartIso: string | null;
  /** Repeat rule, anchored on `scheduledStartIso`. Null for a one-off. */
  scheduledRecurrence: TaskRecurrence | null;
  /** For a recurring task: the start instant of the latest completed occurrence. */
  completedOccurrenceIso: string | null;
  createdAt: string;
}

export interface AppState {
  /** Active task ids, in display order. Done tasks are not listed here. */
  taskOrder: string[];
  tasks: Record<string, Task>;
}

export const SCHEMA_VERSION = 1;

/** The shape written to disk (IndexedDB) and to export files. */
export interface PersistedState {
  version: number;
  state: AppState;
}

export function emptyState(): AppState {
  return { taskOrder: [], tasks: {} };
}
