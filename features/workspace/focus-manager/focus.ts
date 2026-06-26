import type { TaskList } from "@/lib/workspace/types";

export interface TodoFocusTarget {
  desiredOffset?: number;
  id: string;
  offset?: number;
  position?: "start" | "end";
  target: "task-list-title" | "task-title";
  token: number;
}

let focusTargetToken = 0;

export function createFocusTarget(args: Omit<TodoFocusTarget, "token">): TodoFocusTarget {
  focusTargetToken += 1;
  return { ...args, token: focusTargetToken };
}

interface WorkspaceOrderItem {
  id: string;
  kind: "task" | "taskList";
  taskListId?: string;
}

function getWorkspaceOrder(
  taskLists: Record<string, TaskList>,
  taskListOrder: string[],
): WorkspaceOrderItem[] {
  const order: WorkspaceOrderItem[] = [];
  for (const listId of taskListOrder) {
    const taskList = taskLists[listId];
    if (!taskList) continue;
    order.push({ id: listId, kind: "taskList" });
    for (const taskId of taskList.taskOrder) {
      if (taskList.tasks[taskId]) {
        order.push({ id: taskId, kind: "task", taskListId: listId });
      }
    }
  }
  return order;
}

function itemTitleLength(
  item: WorkspaceOrderItem,
  taskLists: Record<string, TaskList>,
) {
  return item.kind === "taskList"
    ? (taskLists[item.id]?.title.length ?? 0)
    : (item.taskListId
      ? taskLists[item.taskListId]?.tasks[item.id]?.title.length ?? 0
      : 0);
}

function focusOnItem(
  item: WorkspaceOrderItem,
  taskLists: Record<string, TaskList>,
  placement: "before" | "after",
): TodoFocusTarget {
  const target = item.kind === "taskList" ? "task-list-title" : "task-title";
  return placement === "before"
    ? createFocusTarget({ id: item.id, offset: itemTitleLength(item, taskLists), target })
    : createFocusTarget({ id: item.id, position: "start", target });
}

export function focusAfterDelete(
  taskLists: Record<string, TaskList>,
  taskListOrder: string[],
  id: string,
): TodoFocusTarget | undefined {
  const order = getWorkspaceOrder(taskLists, taskListOrder);
  const idx = order.findIndex((item) => item.id === id);
  if (idx === -1) return undefined;
  const previous = order[idx - 1];
  if (previous) return focusOnItem(previous, taskLists, "before");
  const next = order[idx + 1];
  if (next) return focusOnItem(next, taskLists, "after");
  return undefined;
}

export function focusAfterDeleteList(
  taskLists: Record<string, TaskList>,
  taskListOrder: string[],
  id: string,
): TodoFocusTarget | undefined {
  const order = getWorkspaceOrder(taskLists, taskListOrder);
  const idx = order.findIndex((item) => item.id === id);
  if (idx === -1) return undefined;
  const previous = order[idx - 1];
  if (previous) return focusOnItem(previous, taskLists, "before");
  const nextList = order.slice(idx + 1).find((item) => item.kind === "taskList");
  if (nextList) return focusOnItem(nextList, taskLists, "after");
  return undefined;
}

export function createTitleFocusTarget(
  args:
    | {
      currentId: string;
      direction: "prev" | "next";
      taskListOrder: string[];
      taskLists: Record<string, TaskList>;
      type: "horizontal";
    }
    | {
      currentId: string;
      direction: "up" | "down";
      focusOffset: number;
      taskListOrder: string[];
      taskLists: Record<string, TaskList>;
      type: "vertical";
    },
): TodoFocusTarget | undefined {
  const order = getWorkspaceOrder(args.taskLists, args.taskListOrder);
  const idx = order.findIndex((item) => item.id === args.currentId);
  if (idx === -1) return undefined;
  const dir =
    args.type === "horizontal"
      ? args.direction
      : args.direction === "up"
        ? "prev"
        : "next";
  const neighbor = order[idx + (dir === "prev" ? -1 : 1)];
  if (!neighbor) return undefined;
  const titleLength = itemTitleLength(neighbor, args.taskLists);
  const target = neighbor.kind === "taskList" ? "task-list-title" : "task-title";
  if (args.type === "horizontal") {
    return createFocusTarget({
      id: neighbor.id,
      offset: args.direction === "prev" ? titleLength : 0,
      target,
    });
  }
  return createFocusTarget({
    desiredOffset: args.focusOffset,
    id: neighbor.id,
    offset: Math.min(args.focusOffset, titleLength),
    target,
  });
}
