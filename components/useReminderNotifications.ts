"use client";

import { useEffect } from "react";

import type { Task } from "@/lib/types";
import { occurrenceCompleted } from "@/lib/recurrence";

// Best-effort reminders. A static, backend-less app cannot push a notification
// to a closed tab — that fundamentally needs a server. So this fires the browser
// Notification API for upcoming reminders *while the app is open*. For true
// background/push reminders, add a serverless cron + web-push (out of scope for
// a zero-dependency, one-click deploy).
const HORIZON_MS = 24 * 60 * 60 * 1000; // only arm timers for the next 24h

export function useReminderNotifications(tasks: Record<string, Task>) {
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;

    const upcoming = Object.values(tasks).filter((t) => {
      if (t.status !== "active" || !t.scheduledStartIso) return false;
      if (occurrenceCompleted(t.completedOccurrenceIso, t.scheduledStartIso)) return false;
      const delay = Date.parse(t.scheduledStartIso) - Date.now();
      return delay > 0 && delay <= HORIZON_MS;
    });

    if (upcoming.length === 0) return;

    // Ask once, lazily — only when something is actually scheduled soon.
    if (Notification.permission === "default") {
      void Notification.requestPermission();
    }

    const timers = upcoming.map((t) => {
      const delay = Date.parse(t.scheduledStartIso!) - Date.now();
      return window.setTimeout(() => {
        if (Notification.permission === "granted") {
          new Notification(t.title || "Reminder", {
            body: t.body.slice(0, 120) || undefined,
            tag: t.id,
          });
        }
      }, delay);
    });

    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [tasks]);
}
