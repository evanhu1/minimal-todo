// Self-contained recurrence math, ported from the source app and simplified to
// operate in the browser's local timezone (a single-user local app has exactly
// one relevant clock). Pure functions, zero dependencies.

import type { RecurrenceFreq, TaskRecurrence } from "@/lib/types";

const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

function startOfLocalDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function matchesFreq(day: Date, freq: RecurrenceFreq, anchor: Date): boolean {
  switch (freq) {
    case "daily":
      return true;
    case "weekdays": {
      const wd = day.getDay();
      return wd >= 1 && wd <= 5;
    }
    case "weekly":
      return day.getDay() === anchor.getDay();
    case "monthly": {
      // Clamp the anchor's day-of-month into shorter months (Jan 31 -> Feb 28).
      const lastDay = new Date(day.getFullYear(), day.getMonth() + 1, 0).getDate();
      return day.getDate() === Math.min(anchor.getDate(), lastDay);
    }
  }
}

/**
 * The next occurrence of a recurring reminder: the first local day matching the
 * cadence, at the anchor's wall-clock time, strictly after both the anchor and
 * `after`. Returns null when the series' `until` date is exhausted.
 */
export function nextOccurrence(
  anchorIso: string,
  recurrence: TaskRecurrence,
  after: Date,
): string | null {
  const anchor = new Date(anchorIso);
  if (Number.isNaN(anchor.getTime())) return null;

  const h = anchor.getHours();
  const m = anchor.getMinutes();
  const s = anchor.getSeconds();
  const afterMs = Math.max(after.getTime(), anchor.getTime());

  let cursor = startOfLocalDay(new Date(afterMs));
  // 400 days covers a monthly cadence plus clamping slack.
  for (let i = 0; i < 400; i += 1) {
    const candidate = new Date(cursor);
    candidate.setHours(h, m, s, 0);
    if (candidate.getTime() > afterMs && matchesFreq(cursor, recurrence.freq, anchor)) {
      if (recurrence.until) {
        const untilEnd = new Date(`${recurrence.until}T23:59:59`);
        if (candidate.getTime() > untilEnd.getTime()) return null;
      }
      return candidate.toISOString();
    }
    cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1);
  }
  return null;
}

/** Human label, e.g. "weekly on Tuesday until 2026-09-01". */
export function describeRecurrence(recurrence: TaskRecurrence, anchorIso: string): string {
  const anchor = new Date(anchorIso);
  let label: string = recurrence.freq;
  if (!Number.isNaN(anchor.getTime())) {
    if (recurrence.freq === "weekly") {
      label = `weekly on ${WEEKDAY_NAMES[anchor.getDay()]}`;
    } else if (recurrence.freq === "monthly") {
      label = `monthly on day ${anchor.getDate()}`;
    }
  }
  return recurrence.until ? `${label} until ${recurrence.until}` : label;
}

/**
 * Whether a recurring task's completion marker already covers the given
 * occurrence — i.e. that occurrence is done and should not re-fire or render as
 * pending.
 */
export function occurrenceCompleted(
  completedOccurrenceIso: string | null,
  occurrenceStartIso: string | null,
): boolean {
  if (!completedOccurrenceIso || !occurrenceStartIso) return false;
  const done = Date.parse(completedOccurrenceIso);
  const occ = Date.parse(occurrenceStartIso);
  return Number.isFinite(done) && Number.isFinite(occ) && done >= occ;
}
