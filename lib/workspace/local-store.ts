import { get, set } from "idb-keyval";

import type { WorkspaceData } from "@/lib/workspace/types";

const WORKSPACE_KEY = "minimal-todo:workspace";

/**
 * Loads the persisted workspace from IndexedDB. Returns null when nothing is
 * stored yet or the stored value is missing/garbage (so the caller can fall
 * back to the seed).
 */
export async function loadWorkspace(): Promise<WorkspaceData | null> {
  try {
    const stored = await get<unknown>(WORKSPACE_KEY);
    if (!stored || typeof stored !== "object") return null;
    const data = stored as Partial<WorkspaceData>;
    if (
      !Array.isArray(data.taskListOrder) ||
      typeof data.taskLists !== "object" ||
      data.taskLists === null
    ) {
      return null;
    }
    return {
      taskListOrder: data.taskListOrder,
      taskLists: data.taskLists as WorkspaceData["taskLists"],
      isLightMode: Boolean(data.isLightMode),
    };
  } catch {
    return null;
  }
}

export async function saveWorkspace(data: WorkspaceData): Promise<void> {
  try {
    await set(WORKSPACE_KEY, data);
  } catch {
    // Best-effort persistence; ignore quota/availability errors.
  }
}
