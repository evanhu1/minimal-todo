import type { Draft } from "immer";

import type {
  Task,
  TaskList,
  WorkspaceData,
} from "./types";

import { hasRichTextContent } from "./rich-text";

export function isTaskEmpty(task: Task): boolean {
  return task.title.trim().length === 0 && !hasRichTextContent(task.body);
}

export function createTaskList(args: {
  id: string;
  title?: string;
  userId: string;
}): TaskList {
  const { id, title = "" } = args;
  return {
    id,
    title,
    taskOrder: [],
    tasks: {},
    isCollapsed: false,
  };
}

export function createTask(args: {
  id: string;
  taskListId: string;
  title?: string;
  body?: string;
  userId: string;
}): Task {
  const {
    id,
    taskListId,
    title = "",
    body = "",
  } = args;
  return {
    id,
    taskListId,
    title,
    body,
    collapsed: true,
    status: "active",
  };
}

export function insertItemAtIndex(
  order: string[],
  id: string,
  insertAtIndex: number,
) {
  return [
    ...order.slice(0, insertAtIndex),
    id,
    ...order.slice(insertAtIndex),
  ];
}

export function removeItem(order: string[], id: string) {
  return order.filter((itemId) => itemId !== id);
}

export function insertUniqueItemAtIndex(
  order: string[],
  id: string,
  insertAtIndex: number,
) {
  const withoutItem = removeItem(order, id);
  const boundedIndex = Math.max(0, Math.min(insertAtIndex, withoutItem.length));
  return insertItemAtIndex(withoutItem, id, boundedIndex);
}

export function getTask(
  taskLists: Record<string, TaskList>,
  taskListId: string,
  taskId: string,
): Task | undefined {
  return taskLists[taskListId]?.tasks[taskId];
}

export function findTaskLocation(
  taskLists: Record<string, TaskList>,
  taskId: string,
): { task: Task; taskList: TaskList } | null {
  for (const taskList of Object.values(taskLists)) {
    const task = taskList.tasks[taskId];
    if (task) return { task, taskList };
  }
  return null;
}

export function moveItem(
  order: string[],
  activeId: string,
  overId: string,
) {
  const activeIndex = order.indexOf(activeId);
  const overIndex = order.indexOf(overId);

  if (activeIndex === -1 || overIndex === -1 || activeIndex === overIndex) {
    return {
      didChange: false as const,
      nextOrder: order,
    };
  }

  const nextOrder = [...order];
  const [moved] = nextOrder.splice(activeIndex, 1);
  nextOrder.splice(overIndex, 0, moved);

  return {
    didChange: true as const,
    nextOrder,
  };
}

export function prepareTaskForList(task: Task, targetList: TaskList): Task {
  return {
    ...task,
    taskListId: targetList.id,
  };
}

/**
 * Reorders `activeId` within `listId`. With `overId`, uses dnd-kit semantics
 * (drag down lands below target, drag up lands above). Without `overId`,
 * appends to the end.
 */
export function reorderWithinList(
  workspace: Draft<WorkspaceData>,
  listId: string,
  activeId: string,
  overId: string | undefined,
): void {
  const list = workspace.taskLists[listId];
  if (!list) return;

  if (overId) {
    const result = moveItem(list.taskOrder, activeId, overId);
    if (result.didChange) {
      list.taskOrder = result.nextOrder;
    }
    return;
  }

  const without = removeItem(list.taskOrder, activeId);
  const nextOrder = [...without, activeId];
  if (nextOrder.every((id, i) => id === list.taskOrder[i])) return;
  list.taskOrder = nextOrder;
}

/**
 * Moves `activeTaskId` from `sourceListId` into `targetListId`, inserting
 * before `overId` if provided (or appending if not).
 */
export function moveBetweenLists(
  workspace: Draft<WorkspaceData>,
  sourceListId: string,
  targetListId: string,
  activeTaskId: string,
  overId: string | undefined,
): void {
  const sourceList = workspace.taskLists[sourceListId];
  const targetList = workspace.taskLists[targetListId];
  if (!sourceList || !targetList) return;
  const activeTask = sourceList.tasks[activeTaskId];
  if (!activeTask) return;

  const targetOrderWithoutActive = removeItem(targetList.taskOrder, activeTaskId);
  const insertionIndex = overId
    ? targetOrderWithoutActive.indexOf(overId)
    : targetOrderWithoutActive.length;
  if (overId && insertionIndex === -1) return;

  sourceList.taskOrder = removeItem(sourceList.taskOrder, activeTaskId);
  delete sourceList.tasks[activeTaskId];
  targetList.taskOrder = insertItemAtIndex(
    targetOrderWithoutActive,
    activeTaskId,
    insertionIndex,
  );
  targetList.tasks[activeTaskId] = prepareTaskForList(activeTask, targetList);
}
