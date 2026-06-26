import type { Task } from "@/lib/workspace/types";

export function formatDayOfWeek(scheduledDay: string): string {
  const [y, m, d] = scheduledDay.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("en-US", { weekday: "short" });
}

export function formatRelativeFromNow(target: Date, now: Date): string {
  const diffMs = target.getTime() - now.getTime();
  const past = diffMs < 0;
  const minutes = Math.round(Math.abs(diffMs) / 60_000);
  if (minutes < 1) return "now";
  if (minutes < 60) return past ? `${minutes} min ago` : `in ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    const label = `${hours} ${hours === 1 ? "hr" : "hrs"}`;
    return past ? `${label} ago` : `in ${label}`;
  }
  const days = Math.round(hours / 24);
  const label = `${days} ${days === 1 ? "day" : "days"}`;
  return past ? `${label} ago` : `in ${label}`;
}

export function hasTaskReminder(task: Task): boolean {
  return Boolean(task.scheduledDay || task.scheduledStartIso || task.scheduledEventId);
}
