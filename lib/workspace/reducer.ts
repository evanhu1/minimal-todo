import { current, isDraft, original, type Draft } from "immer";
import cloneDeep from "lodash/cloneDeep";

import type {
  Task,
  TaskList,
  WorkspaceData,
} from "@/lib/workspace/types";
import {
  createFocusTarget,
  focusAfterDelete,
  focusAfterDeleteList,
  type TodoFocusTarget,
} from "@/features/workspace/focus-manager/focus";

import {
  createTask,
  createTaskList,
  findTaskLocation,
  getTask,
  insertItemAtIndex,
  insertUniqueItemAtIndex,
  isTaskEmpty,
  moveBetweenLists,
  moveItem,
  prepareTaskForList,
  removeItem,
  reorderWithinList,
} from "@/lib/workspace/state-utils";

const MAX_HISTORY = 100;

interface HistorySnapshot {
  workspaceData: WorkspaceData;
  focusTarget: TodoFocusTarget | null;
}

interface HistoryEntry extends HistorySnapshot {
  restoreFocus: boolean;
}

export interface WorkspaceReducerState {
  focusTarget: TodoFocusTarget | null;
  undoStack: HistoryEntry[];
  redoStack: HistoryEntry[];
  workspaceData: WorkspaceData;
  dragSnapshot: HistorySnapshot | null;
}

export type WorkspaceReducerAction =
  | { type: "clear_focus_target"; token: number }
  | { type: "update_task_list_title"; id: string; title: string }
  | { type: "update_task_title"; id: string; taskListId: string; title: string }
  | { type: "update_task_body"; id: string; taskListId: string; body: string }
  | {
    type: "create_task_list";
    id: string;
    insertAtIndex: number;
    userId: string;
  }
  | {
    type: "create_task_below";
    id: string;
    taskListId: string;
    newTaskId: string;
    userId: string;
  }
  | {
    type: "create_task_above";
    id: string;
    taskListId: string;
    newTaskId: string;
    userId: string;
  }
  | {
    type: "split_task_title";
    id: string;
    taskListId: string;
    newTaskId: string;
    caretOffset: number;
    userId: string;
  }
  | { type: "toggle_collapse"; id: string; taskListId: string }
  | { type: "toggle_task_list_collapse"; id: string }
  | { type: "move_task_list"; activeTaskListId: string; overTaskListId: string }
  | {
    type: "move_task_within_task_list";
    taskListId: string;
    activeTaskId: string;
    overTaskId: string;
  }
  | {
    type: "move_task_to_task_list";
    activeTaskId: string;
    overTaskId?: string;
    targetTaskListId: string;
    targetInsertIndex?: number;
  }
  | { type: "delete_task"; id: string; taskListId: string }
  | { type: "mark_task_done"; id: string; taskListId: string }
  | { type: "restore_task"; id: string; taskListId: string }
  | {
    type: "set_task_reminder";
    id: string;
    taskListId: string;
    scheduledDay: string | null;
    scheduledStartIso: string | null;
    scheduledEndIso: string | null;
    scheduledTimeZone: string | null;
  }
  | { type: "clear_task_reminder"; id: string; taskListId: string }
  | { type: "delete_task_list"; id: string }
  | { type: "delete_backward"; id: string; taskListId: string }
  | { type: "delete_forward"; id: string; taskListId: string }
  | {
    type: "add_task";
    id: string;
    taskListId: string;
    title?: string;
    body?: string;
    focus?: boolean;
    userId: string;
  }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "begin_drag" }
  | { type: "end_drag" }
  | { type: "cancel_drag" }
  | { type: "hydrate_workspace_data"; workspaceData: WorkspaceData }
  | { type: "set_light_mode"; isLightMode: boolean };

type UndoableActionType =
  | "create_task_list"
  | "create_task_below"
  | "create_task_above"
  | "split_task_title"
  | "toggle_collapse"
  | "toggle_task_list_collapse"
  | "move_task_list"
  | "move_task_within_task_list"
  | "move_task_to_task_list"
  | "delete_task"
  | "mark_task_done"
  | "restore_task"
  | "delete_task_list"
  | "delete_backward"
  | "delete_forward"
  | "add_task";

const UNDOABLE_ACTIONS: ReadonlySet<UndoableActionType> = new Set([
  "create_task_list",
  "create_task_below",
  "create_task_above",
  "split_task_title",
  "toggle_collapse",
  "toggle_task_list_collapse",
  "move_task_list",
  "move_task_within_task_list",
  "move_task_to_task_list",
  "delete_task",
  "mark_task_done",
  "restore_task",
  "delete_task_list",
  "delete_backward",
  "delete_forward",
  "add_task",
]);

function isUndoableAction(
  action: WorkspaceReducerAction,
): action is WorkspaceReducerAction & { type: UndoableActionType } {
  return UNDOABLE_ACTIONS.has(action.type as UndoableActionType);
}

export interface WorkspaceInitializerArg {
  workspaceData: WorkspaceData;
}

export function createInitialWorkspaceReducerState({
  workspaceData,
}: WorkspaceInitializerArg): WorkspaceReducerState {
  return {
    focusTarget: null,
    undoStack: [],
    redoStack: [],
    workspaceData: cloneDeep(workspaceData),
    dragSnapshot: null,
  };
}

function unwrap<T>(value: T): T {
  return isDraft(value) ? (original(value as Draft<T>) as T) : value;
}

function captureSnapshot(state: Draft<WorkspaceReducerState>): HistorySnapshot {
  return {
    workspaceData: unwrap(state.workspaceData) as WorkspaceData,
    focusTarget: unwrap(state.focusTarget) as TodoFocusTarget | null,
  };
}

function pushUndoEntry(state: Draft<WorkspaceReducerState>, entry: HistoryEntry) {
  state.undoStack.push(entry);
  while (state.undoStack.length > MAX_HISTORY) {
    state.undoStack.shift();
  }
  state.redoStack = [];
}

function regenerateFocus(
  focus: TodoFocusTarget | null,
): TodoFocusTarget | null {
  if (!focus) return null;
  const {
    desiredOffset,
    id,
    offset,
    position,
    target,
  } = focus;
  return createFocusTarget({ desiredOffset, id, offset, position, target });
}

function restoreFromEntry(
  state: Draft<WorkspaceReducerState>,
  entry: HistoryEntry,
) {
  state.workspaceData = entry.workspaceData;
  state.focusTarget = entry.restoreFocus
    ? regenerateFocus(entry.focusTarget)
    : null;
}

export function workspaceReducer(
  state: Draft<WorkspaceReducerState>,
  action: WorkspaceReducerAction,
) {
  if (action.type === "undo") {
    const entry = state.undoStack.pop();
    if (!entry) return;
    state.redoStack.push({
      ...captureSnapshot(state),
      restoreFocus: entry.restoreFocus,
    });
    restoreFromEntry(state, entry);
    return;
  }

  if (action.type === "redo") {
    const entry = state.redoStack.pop();
    if (!entry) return;
    state.undoStack.push({
      ...captureSnapshot(state),
      restoreFocus: entry.restoreFocus,
    });
    restoreFromEntry(state, entry);
    return;
  }

  if (action.type === "begin_drag") {
    if (state.dragSnapshot) return;
    state.dragSnapshot = captureSnapshot(state);
    return;
  }

  if (action.type === "end_drag") {
    const snapshot = state.dragSnapshot;
    state.dragSnapshot = null;
    if (!snapshot) return;
    const currentWorkspaceData = unwrap(state.workspaceData) as WorkspaceData;
    if (currentWorkspaceData === snapshot.workspaceData) return;
    pushUndoEntry(state, { ...snapshot, restoreFocus: true });
    return;
  }

  if (action.type === "cancel_drag") {
    const snapshot = state.dragSnapshot;
    state.dragSnapshot = null;
    if (!snapshot) return;
    restoreFromEntry(state, { ...snapshot, restoreFocus: false });
    return;
  }

  const isUndoable = isUndoableAction(action) && !state.dragSnapshot;

  if (!isUndoable) {
    applyAction(state, action);
    return;
  }

  const preSnapshot = captureSnapshot(state);
  const prevData = preSnapshot.workspaceData;
  applyAction(state, action);
  if (current(state.workspaceData) === prevData) {
    // no-op: do not record history, do not wipe redo stack
    return;
  }
  pushUndoEntry(state, {
    workspaceData: prevData as WorkspaceData,
    focusTarget: preSnapshot.focusTarget,
    restoreFocus: true,
  });
}

function applyAction(
  state: Draft<WorkspaceReducerState>,
  action: WorkspaceReducerAction,
) {
  const { taskListOrder, taskLists } = state.workspaceData;

  switch (action.type) {
    case "clear_focus_target":
      if (state.focusTarget?.token === action.token) {
        state.focusTarget = null;
      }
      return;

    case "hydrate_workspace_data":
      state.workspaceData = cloneDeep(action.workspaceData);
      state.undoStack = [];
      state.redoStack = [];
      state.focusTarget = null;
      state.dragSnapshot = null;
      return;

    case "update_task_list_title": {
      const taskList = taskLists[action.id];
      if (!taskList || taskList.title === action.title) {
        return;
      }

      state.workspaceData.taskLists[action.id] = {
        ...taskList,
        title: action.title,
      };
      return;
    }

    case "update_task_title": {
      const task = getTask(taskLists, action.taskListId, action.id);
      if (!task || task.title === action.title) {
        return;
      }

      state.workspaceData.taskLists[action.taskListId].tasks[action.id] = {
        ...task,
        title: action.title,
      };
      return;
    }

    case "update_task_body": {
      const task = getTask(taskLists, action.taskListId, action.id);
      if (!task || task.body === action.body) {
        return;
      }

      state.workspaceData.taskLists[action.taskListId].tasks[action.id] = {
        ...task,
        body: action.body,
      };
      return;
    }

    case "create_task_list": {
      state.workspaceData.taskListOrder = insertItemAtIndex(
        taskListOrder,
        action.id,
        action.insertAtIndex,
      );
      state.workspaceData.taskLists[action.id] = createTaskList({
        id: action.id,
        userId: action.userId,
      });
      state.focusTarget = createFocusTarget({
        id: action.id,
        target: "task-list-title",
        position: "end",
      });
      return;
    }

    case "create_task_below": {
      const taskList = taskLists[action.taskListId];
      const currentTask = getTask(taskLists, action.taskListId, action.id);
      if (!taskList || !currentTask) {
        return;
      }

      const currentIndex = taskList.taskOrder.indexOf(action.id);
      if (currentIndex === -1) {
        return;
      }

      const nextTask = createTask({
        id: action.newTaskId,
        taskListId: action.taskListId,
        userId: action.userId,
      });
      state.workspaceData.taskLists[action.taskListId].taskOrder = insertItemAtIndex(
        taskList.taskOrder,
        nextTask.id,
        currentIndex + 1,
      );
      state.workspaceData.taskLists[action.taskListId].tasks[nextTask.id] = nextTask;
      state.focusTarget = createFocusTarget({
        id: action.newTaskId,
        target: "task-title",
        position: "end",
      });
      return;
    }

    case "create_task_above": {
      const taskList = taskLists[action.taskListId];
      const currentTask = getTask(taskLists, action.taskListId, action.id);
      if (!taskList || !currentTask) {
        return;
      }

      const currentIndex = taskList.taskOrder.indexOf(action.id);
      if (currentIndex === -1) {
        return;
      }

      const nextTask = createTask({
        id: action.newTaskId,
        taskListId: action.taskListId,
        userId: action.userId,
      });
      state.workspaceData.taskLists[action.taskListId].taskOrder = insertItemAtIndex(
        taskList.taskOrder,
        nextTask.id,
        currentIndex,
      );
      state.workspaceData.taskLists[action.taskListId].tasks[nextTask.id] = nextTask;
      state.focusTarget = createFocusTarget({
        id: action.newTaskId,
        target: "task-title",
        position: "end",
      });
      return;
    }

    case "split_task_title": {
      const taskList = taskLists[action.taskListId];
      const currentTask = getTask(taskLists, action.taskListId, action.id);
      if (!taskList || !currentTask) {
        return;
      }

      const taskTitle = currentTask.title;
      const caretOffset = Math.max(0, Math.min(action.caretOffset, taskTitle.length));
      const listIndex = taskList.taskOrder.indexOf(action.id);
      if (listIndex === -1) {
        return;
      }

      const insertAbove = caretOffset === 0 && taskTitle.length > 0;
      const insertAtIndex = insertAbove ? listIndex : listIndex + 1;
      const newTaskTitle = insertAbove ? "" : taskTitle.slice(caretOffset);

      if (!insertAbove) {
        state.workspaceData.taskLists[action.taskListId].tasks[action.id] = {
          ...currentTask,
          title: taskTitle.slice(0, caretOffset),
        };
      }

      const nextTask = createTask({
        id: action.newTaskId,
        taskListId: action.taskListId,
        title: newTaskTitle,
        userId: action.userId,
      });
      const nextOrder = insertItemAtIndex(
        state.workspaceData.taskLists[action.taskListId].taskOrder,
        nextTask.id,
        insertAtIndex,
      );
      state.workspaceData.taskLists[action.taskListId].taskOrder = nextOrder;
      state.workspaceData.taskLists[action.taskListId].tasks[nextTask.id] = nextTask;
      state.focusTarget = insertAbove
        ? createFocusTarget({
          id: action.id,
          target: "task-title",
          position: "start",
        })
        : createFocusTarget({
          id: action.newTaskId,
          target: "task-title",
          position: "start",
        });
      return;
    }

    case "toggle_collapse": {
      const task = getTask(taskLists, action.taskListId, action.id);
      if (!task) {
        return;
      }

      state.workspaceData.taskLists[action.taskListId].tasks[action.id] = {
        ...task,
        collapsed: !task.collapsed,
      };
      return;
    }

    case "toggle_task_list_collapse": {
      const taskList = taskLists[action.id];
      if (!taskList) {
        return;
      }
      state.workspaceData.taskLists[action.id] = {
        ...taskList,
        isCollapsed: !taskList.isCollapsed,
      };
      return;
    }

    case "move_task_list": {
      const result = moveItem(
        taskListOrder,
        action.activeTaskListId,
        action.overTaskListId,
      );
      if (result.didChange) {
        state.workspaceData.taskListOrder = result.nextOrder;
      }
      return;
    }

    case "move_task_within_task_list": {
      const taskList = taskLists[action.taskListId];
      if (!taskList) {
        return;
      }

      const result = moveItem(
        taskList.taskOrder,
        action.activeTaskId,
        action.overTaskId,
      );
      if (result.didChange) {
        state.workspaceData.taskLists[action.taskListId].taskOrder = result.nextOrder;
      }
      return;
    }

    case "move_task_to_task_list": {
      const active = findTaskLocation(taskLists, action.activeTaskId);
      const targetList = taskLists[action.targetTaskListId];
      if (!active || !targetList) return;

      if (active.taskList.id === targetList.id) {
        if (action.targetInsertIndex !== undefined) {
          moveTaskWithinListToIndex(
            state.workspaceData,
            targetList.id,
            action.activeTaskId,
            action.targetInsertIndex,
          );
        } else {
          reorderWithinList(
            state.workspaceData,
            targetList.id,
            action.activeTaskId,
            action.overTaskId,
          );
        }
      } else {
        if (action.targetInsertIndex !== undefined) {
          moveTaskBetweenListsToIndex(
            state.workspaceData,
            active.taskList.id,
            targetList.id,
            action.activeTaskId,
            action.targetInsertIndex,
          );
        } else {
          moveBetweenLists(
            state.workspaceData,
            active.taskList.id,
            targetList.id,
            action.activeTaskId,
            action.overTaskId,
          );
        }
      }
      return;
    }

    case "delete_task": {
      if (!getTask(taskLists, action.taskListId, action.id)) return;
      removeTaskWithFocus(state, action.taskListId, action.id, { deleteEntity: true });
      return;
    }

    case "mark_task_done": {
      const task = getTask(taskLists, action.taskListId, action.id);
      if (!task || task.status === "done") return;

      const empty = isTaskEmpty(task);
      if (!empty) {
        state.workspaceData.taskLists[action.taskListId].tasks[action.id] = {
          ...task,
          status: "done",
          completedAt: new Date(),
        };
      }
      removeTaskWithFocus(state, action.taskListId, action.id, { deleteEntity: empty });

      return;
    }

    case "restore_task": {
      const task = getTask(taskLists, action.taskListId, action.id);
      if (!task) return;

      const taskList = state.workspaceData.taskLists[action.taskListId];
      taskList.tasks[action.id] = {
        ...task,
        status: "active",
        completedAt: null,
      };
      if (!taskList.taskOrder.includes(action.id)) {
        taskList.taskOrder = [...taskList.taskOrder, action.id];
      }
      return;
    }

    case "set_task_reminder": {
      const task = getTask(taskLists, action.taskListId, action.id);
      if (!task) return;

      state.workspaceData.taskLists[action.taskListId].tasks[action.id] = {
        ...task,
        scheduledDay: action.scheduledDay,
        scheduledStartIso: action.scheduledStartIso,
        scheduledEndIso: action.scheduledEndIso,
        scheduledTimeZone: action.scheduledTimeZone,
      };
      return;
    }

    case "clear_task_reminder": {
      const task = getTask(taskLists, action.taskListId, action.id);
      if (!task) return;

      state.workspaceData.taskLists[action.taskListId].tasks[action.id] = {
        ...task,
        scheduledDay: null,
        scheduledStartIso: null,
        scheduledEndIso: null,
        scheduledTimeZone: null,
      };
      return;
    }

    case "delete_task_list": {
      const taskList = taskLists[action.id];
      if (!taskList) {
        return;
      }

      const focusTarget = focusAfterDeleteList(taskLists, taskListOrder, action.id);
      state.workspaceData.taskListOrder = removeItem(taskListOrder, action.id);
      delete state.workspaceData.taskLists[action.id];
      state.focusTarget = focusTarget ?? null;
      return;
    }

    case "delete_backward":
    case "delete_forward": {
      const taskList = taskLists[action.taskListId];
      const currentTask = getTask(taskLists, action.taskListId, action.id);
      if (!taskList || !currentTask) return;

      const currentIndex = taskList.taskOrder.indexOf(action.id);
      if (currentIndex === -1) return;

      const isBackward = action.type === "delete_backward";
      const siblingId = taskList.taskOrder[isBackward ? currentIndex - 1 : currentIndex + 1];
      const sibling = siblingId ? taskList.tasks[siblingId] : undefined;

      if (!sibling) {
        if (!isTaskEmpty(currentTask)) return;
        removeTaskWithFocus(state, action.taskListId, action.id, { deleteEntity: true });
        return;
      }

      const [survivor, removed] = isBackward
        ? [sibling, currentTask]
        : [currentTask, sibling];
      mergeAdjacentTasks(state, action.taskListId, survivor, removed);
      return;
    }

    case "add_task": {
      const taskList = taskLists[action.taskListId];
      if (!taskList) {
        return;
      }

      const nextTask = createTask({
        id: action.id,
        taskListId: action.taskListId,
        title: action.title,
        body: action.body,
        userId: action.userId,
      });
      state.workspaceData.taskLists[action.taskListId].taskOrder = insertItemAtIndex(
        taskList.taskOrder,
        nextTask.id,
        getInsertIndex(taskLists, action.taskListId),
      );
      state.workspaceData.taskLists[action.taskListId].tasks[nextTask.id] = nextTask;
      if (taskList.isCollapsed) {
        state.workspaceData.taskLists[action.taskListId].isCollapsed = false;
      }
      state.focusTarget = action.focus
        ? createFocusTarget({
          id: action.id,
          target: "task-title",
          position: "end",
        })
        : null;
      return;
    }

    case "set_light_mode": {
      state.workspaceData.isLightMode = action.isLightMode;
      return;
    }
  }
}

function getInsertIndex(taskLists: Record<string, TaskList>, taskListId: string) {
  return taskLists[taskListId]?.taskOrder.length ?? 0;
}

function moveTaskWithinListToIndex(
  workspace: Draft<WorkspaceData>,
  taskListId: string,
  taskId: string,
  insertIndex: number,
): void {
  const taskList = workspace.taskLists[taskListId];
  if (!taskList || !taskList.tasks[taskId]) return;
  taskList.taskOrder = insertUniqueItemAtIndex(
    taskList.taskOrder,
    taskId,
    insertIndex,
  );
}

function moveTaskBetweenListsToIndex(
  workspace: Draft<WorkspaceData>,
  sourceListId: string,
  targetListId: string,
  taskId: string,
  insertIndex: number,
): void {
  const sourceList = workspace.taskLists[sourceListId];
  const targetList = workspace.taskLists[targetListId];
  if (!sourceList || !targetList) return;
  const task = sourceList.tasks[taskId];
  if (!task) return;

  sourceList.taskOrder = removeItem(sourceList.taskOrder, taskId);
  delete sourceList.tasks[taskId];
  targetList.taskOrder = insertUniqueItemAtIndex(
    targetList.taskOrder,
    taskId,
    insertIndex,
  );
  targetList.tasks[taskId] = prepareTaskForList(task, targetList);
}

function removeTaskWithFocus(
  state: Draft<WorkspaceReducerState>,
  taskListId: string,
  taskId: string,
  options: { deleteEntity: boolean },
): void {
  const taskList = state.workspaceData.taskLists[taskListId];
  if (!taskList) return;

  const focusTarget = focusAfterDelete(
    state.workspaceData.taskLists,
    state.workspaceData.taskListOrder,
    taskId,
  );
  taskList.taskOrder = removeItem(taskList.taskOrder, taskId);
  if (options.deleteEntity) {
    delete taskList.tasks[taskId];
  }
  state.focusTarget = focusTarget ?? null;
}

function mergeAdjacentTasks(
  state: Draft<WorkspaceReducerState>,
  taskListId: string,
  survivor: Task,
  removed: Task,
): void {
  const taskList = state.workspaceData.taskLists[taskListId];
  if (!taskList) return;

  const survivorTitle = survivor.title;
  taskList.tasks[survivor.id] = {
    ...survivor,
    title: `${survivorTitle}${removed.title}`,
  };
  delete taskList.tasks[removed.id];
  taskList.taskOrder = removeItem(taskList.taskOrder, removed.id);
  state.focusTarget = createFocusTarget({
    id: survivor.id,
    offset: survivorTitle.length,
    target: "task-title",
  });
}
