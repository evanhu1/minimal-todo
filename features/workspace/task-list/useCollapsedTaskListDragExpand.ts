"use client";

import { useDndMonitor } from "@dnd-kit/core";
import { useCallback, useEffect, useRef, useState } from "react";

import { getDragData } from "@/features/workspace/drag/types";
import { useWorkspaceDispatch } from "@/features/workspace/WorkspaceContext";

const COLLAPSED_LIST_EXPAND_DELAY_MS = 600;

export function useCollapsedTaskListDragExpand(
  taskListId: string,
  isCollapsed: boolean,
) {
  const dispatch = useWorkspaceDispatch();
  const hoverZoneRef = useRef<HTMLDivElement | null>(null);
  const expandTimeoutRef = useRef<number | null>(null);
  const taskDragActiveRef = useRef(false);
  const [isTaskDragOverCollapsedList, setIsTaskDragOverCollapsedList] =
    useState(false);

  const processDragPointer = useCallback(
    (clientX: number, clientY: number) => {
      if (!taskDragActiveRef.current || !isCollapsed) {
        setIsTaskDragOverCollapsedList(false);
        return;
      }

      const node = hoverZoneRef.current;
      if (!node) {
        setIsTaskDragOverCollapsedList(false);
        return;
      }

      const rect = node.getBoundingClientRect();
      const isWithin =
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom;

      setIsTaskDragOverCollapsedList(isWithin);
    },
    [isCollapsed],
  );

  useDndMonitor({
    onDragStart(event) {
      taskDragActiveRef.current = getDragData(event.active)?.type === "task";
      setIsTaskDragOverCollapsedList(false);
    },
    onDragEnd() {
      taskDragActiveRef.current = false;
      setIsTaskDragOverCollapsedList(false);
    },
    onDragCancel() {
      taskDragActiveRef.current = false;
      setIsTaskDragOverCollapsedList(false);
    },
  });

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      processDragPointer(event.clientX, event.clientY);
    };
    const onTouchMove = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!touch) return;
      processDragPointer(touch.clientX, touch.clientY);
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("touchmove", onTouchMove);
    };
  }, [processDragPointer]);

  useEffect(() => {
    if (!isCollapsed || !isTaskDragOverCollapsedList) {
      if (expandTimeoutRef.current !== null) {
        window.clearTimeout(expandTimeoutRef.current);
        expandTimeoutRef.current = null;
      }
      return;
    }

    expandTimeoutRef.current = window.setTimeout(() => {
      expandTimeoutRef.current = null;
      dispatch({ type: "toggle_task_list_collapse", id: taskListId });
    }, COLLAPSED_LIST_EXPAND_DELAY_MS);

    return () => {
      if (expandTimeoutRef.current !== null) {
        window.clearTimeout(expandTimeoutRef.current);
        expandTimeoutRef.current = null;
      }
    };
  }, [dispatch, isCollapsed, isTaskDragOverCollapsedList, taskListId]);

  return {
    hoverZoneRef,
    isTaskDragOverCollapsedList,
  };
}
