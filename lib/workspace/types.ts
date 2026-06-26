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
  /** Re-stamped whenever the task moves to a different list (createdAt does not). */
  addedAt?: Date;
}

export interface WorkspaceData {
  taskListOrder: string[];
  taskLists: Record<string, TaskList>;
  /** Workspace color theme preference. */
  isLightMode: boolean;
}
