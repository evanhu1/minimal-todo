import type { TaskList, WorkspaceData } from "@/lib/workspace/types";

const DEFAULT_LISTS: { title: string; isCollapsed: boolean }[] = [
  { title: "Today", isCollapsed: false },
  { title: "Tomorrow", isCollapsed: true },
  { title: "This Week", isCollapsed: true },
  { title: "Long Term Goals", isCollapsed: true },
  { title: "Backlog / Someday", isCollapsed: true },
];

/**
 * Builds the default workspace used the first time the app loads (before any
 * IndexedDB state exists). Today is expanded; the rest start collapsed.
 */
export function seedWorkspace(): WorkspaceData {
  const taskLists: Record<string, TaskList> = {};
  const taskListOrder: string[] = [];

  for (const { title, isCollapsed } of DEFAULT_LISTS) {
    const id = crypto.randomUUID();
    taskListOrder.push(id);
    taskLists[id] = {
      id,
      title,
      taskOrder: [],
      tasks: {},
      isCollapsed,
    };
  }

  return {
    taskListOrder,
    taskLists,
    isLightMode: false,
  };
}
