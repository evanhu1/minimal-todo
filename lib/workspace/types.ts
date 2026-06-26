export type TaskStatus = "active" | "done";

export interface TaskList {
  id: string;
  title: string;
  /** Task id order within this list. */
  taskOrder: string[];
  tasks: Record<string, Task>;
  isCollapsed?: boolean;
}

export interface Task {
  id: string;
  taskListId: string;
  title: string;
  body: string;
  status: TaskStatus;
  completedAt?: Date | null;
  collapsed: boolean;
  parentTaskId?: string | null;
  /** Re-stamped whenever the task moves to a different list (createdAt does not). */
  addedAt?: Date;
  scheduledEventId?: string | null;
  scheduledCalendarId?: string | null;
  /** Local ISO date (YYYY-MM-DD) of the scheduled day. */
  scheduledDay?: string | null;
  scheduledStartIso?: string | null;
  scheduledEndIso?: string | null;
  scheduledTimeZone?: string | null;
}

export interface WorkspaceData {
  taskListOrder: string[];
  taskLists: Record<string, TaskList>;
  /** Workspace color theme preference. */
  isLightMode: boolean;
}
