"use client";

import { useCallback } from "react";

import type { Task } from "@/lib/workspace/types";
import { useWorkspaceDispatch, useWorkspaceState } from "@/features/workspace/WorkspaceContext";

const LOCAL_USER_ID = "local-user";

export function useTaskOperations() {
  const dispatch = useWorkspaceDispatch();
  const { taskLists } = useWorkspaceState();

  const addTask = useCallback(
    (input: {
      taskListId: string;
      title?: string;
      body?: string;
      focus?: boolean;
    }) => {
      if (!taskLists[input.taskListId]) return null;

      const id = crypto.randomUUID();
      dispatch({
        type: "add_task",
        id,
        taskListId: input.taskListId,
        title: input.title,
        body: input.body,
        focus: input.focus,
        userId: LOCAL_USER_ID,
      });

      return id;
    },
    [dispatch, taskLists],
  );

  const createTaskBelow = useCallback(
    (input: { task: Task }) => {
      const taskList = taskLists[input.task.taskListId];
      if (
        !taskList ||
        !taskList.tasks[input.task.id] ||
        !taskList.taskOrder.includes(input.task.id)
      ) {
        return null;
      }

      const newTaskId = crypto.randomUUID();
      dispatch({
        type: "create_task_below",
        id: input.task.id,
        taskListId: input.task.taskListId,
        newTaskId,
        userId: LOCAL_USER_ID,
      });

      return newTaskId;
    },
    [dispatch, taskLists],
  );

  const createTaskAbove = useCallback(
    (input: { task: Task }) => {
      const taskList = taskLists[input.task.taskListId];
      if (
        !taskList ||
        !taskList.tasks[input.task.id] ||
        !taskList.taskOrder.includes(input.task.id)
      ) {
        return null;
      }

      const newTaskId = crypto.randomUUID();
      dispatch({
        type: "create_task_above",
        id: input.task.id,
        taskListId: input.task.taskListId,
        newTaskId,
        userId: LOCAL_USER_ID,
      });

      return newTaskId;
    },
    [dispatch, taskLists],
  );

  const splitTaskTitle = useCallback(
    (input: { task: Task; caretOffset: number }) => {
      const taskList = taskLists[input.task.taskListId];
      if (
        !taskList ||
        !taskList.tasks[input.task.id] ||
        !taskList.taskOrder.includes(input.task.id)
      ) {
        return null;
      }

      const newTaskId = crypto.randomUUID();
      dispatch({
        type: "split_task_title",
        id: input.task.id,
        taskListId: input.task.taskListId,
        newTaskId,
        caretOffset: input.caretOffset,
        userId: LOCAL_USER_ID,
      });

      return newTaskId;
    },
    [dispatch, taskLists],
  );

  return {
    addTask,
    canCreateTasks: true,
    createTaskAbove,
    createTaskBelow,
    splitTaskTitle,
  };
}
