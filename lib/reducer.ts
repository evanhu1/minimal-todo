// The state engine. A pure immer reducer — the same local-first pattern the
// source app uses, minus the server-sync layer that sat on top of it.

import type { AppState, Task, TaskRecurrence, TaskStatus } from "@/lib/types";

export type Action =
  | { type: "add_task"; id: string; title: string; nowIso: string }
  | { type: "update_title"; id: string; title: string }
  | { type: "update_body"; id: string; body: string }
  | { type: "set_status"; id: string; status: TaskStatus; nowIso: string }
  | {
      type: "set_schedule";
      id: string;
      startIso: string | null;
      recurrence: TaskRecurrence | null;
    }
  // Recurring task: the current occurrence is done; advance to the next one and
  // keep the task active. `nextStartIso` is null when the series has ended.
  | { type: "advance_recurrence"; id: string; nextStartIso: string | null; nowIso: string }
  | { type: "delete_task"; id: string }
  | { type: "reorder"; order: string[] }
  | { type: "replace_state"; state: AppState };

export function reducer(draft: AppState, action: Action): void {
  switch (action.type) {
    case "add_task": {
      const title = action.title.trim();
      if (!title) return;
      const task: Task = {
        id: action.id,
        title,
        body: "",
        status: "active",
        completedAt: null,
        scheduledStartIso: null,
        scheduledRecurrence: null,
        completedOccurrenceIso: null,
        createdAt: action.nowIso,
      };
      draft.tasks[task.id] = task;
      draft.taskOrder.unshift(task.id);
      return;
    }

    case "update_title": {
      const task = draft.tasks[action.id];
      if (task) task.title = action.title;
      return;
    }

    case "update_body": {
      const task = draft.tasks[action.id];
      if (task) task.body = action.body;
      return;
    }

    case "set_status": {
      const task = draft.tasks[action.id];
      if (!task) return;
      task.status = action.status;
      if (action.status === "done") {
        task.completedAt = action.nowIso;
        draft.taskOrder = draft.taskOrder.filter((id) => id !== action.id);
      } else {
        task.completedAt = null;
        if (!draft.taskOrder.includes(action.id)) draft.taskOrder.unshift(action.id);
      }
      return;
    }

    case "set_schedule": {
      const task = draft.tasks[action.id];
      if (!task) return;
      task.scheduledStartIso = action.startIso;
      task.scheduledRecurrence = action.startIso ? action.recurrence : null;
      // Re-anchoring clears a stale per-occurrence completion marker.
      task.completedOccurrenceIso = null;
      return;
    }

    case "advance_recurrence": {
      const task = draft.tasks[action.id];
      if (!task) return;
      task.completedOccurrenceIso = task.scheduledStartIso;
      if (action.nextStartIso) {
        task.scheduledStartIso = action.nextStartIso;
      } else {
        // Series exhausted — finish the task outright.
        task.status = "done";
        task.completedAt = action.nowIso;
        task.scheduledRecurrence = null;
        draft.taskOrder = draft.taskOrder.filter((id) => id !== action.id);
      }
      return;
    }

    case "delete_task": {
      delete draft.tasks[action.id];
      draft.taskOrder = draft.taskOrder.filter((id) => id !== action.id);
      return;
    }

    case "reorder": {
      draft.taskOrder = action.order;
      return;
    }

    case "replace_state": {
      draft.taskOrder = action.state.taskOrder;
      draft.tasks = action.state.tasks;
      return;
    }
  }
}
