"use client";

import { useCallback } from "react";

import { useWorkspaceDispatch, useWorkspaceState } from "@/features/workspace/WorkspaceContext";

export function useTaskListOperations() {
  const dispatch = useWorkspaceDispatch();
  const { taskLists } = useWorkspaceState();

  const updateTaskListTitle = useCallback(
    (input: { id: string; title: string }) => {
      if (!taskLists[input.id]) return;

      dispatch({
        type: "update_task_list_title",
        id: input.id,
        title: input.title,
      });
    },
    [dispatch, taskLists],
  );

  const toggleTaskListCollapse = useCallback(
    (input: { id: string }) => {
      if (!taskLists[input.id]) return;

      dispatch({ type: "toggle_task_list_collapse", id: input.id });
    },
    [dispatch, taskLists],
  );

  const deleteTaskList = useCallback(
    (input: { id: string }) => {
      if (!taskLists[input.id]) return;

      dispatch({ type: "delete_task_list", id: input.id });
    },
    [dispatch, taskLists],
  );

  return {
    deleteTaskList,
    toggleTaskListCollapse,
    updateTaskListTitle,
  };
}
