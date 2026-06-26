"use client";

import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { type ReactNode, useCallback, useState } from "react";

import type { Task } from "@/lib/workspace/types";

import { TaskDragPreview } from "@/features/workspace/task/TaskBlock";
import {
  useWorkspaceDispatch,
  useWorkspaceState,
} from "@/features/workspace/WorkspaceContext";
import { taskDragCollisionDetection } from "./collision";
import { getDragData, type DragDataType } from "./types";

interface ActiveDrag {
  type: DragDataType | null;
  width: number | null;
  task: Task | null;
}

interface TodoDndProviderProps {
  children: ReactNode;
}

export function TodoDndProvider({ children }: TodoDndProviderProps) {
  const dispatch = useWorkspaceDispatch();
  const { taskLists, workspaceId } = useWorkspaceState();

  const [activeDrag, setActiveDrag] = useState<ActiveDrag | null>(null);

  const resetActiveDrag = useCallback(() => {
    setActiveDrag(null);
  }, []);

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 400, tolerance: 5 },
    }),
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const id = String(event.active.id);
      const dragData = getDragData(event.active);
      const task =
        dragData?.type === "task"
          ? taskLists[dragData.taskListId]?.tasks[id] ?? null
          : null;
      setActiveDrag({
        type: dragData?.type ?? null,
        width: event.active.rect.current.initial?.width ?? null,
        task,
      });
      dispatch({ type: "begin_drag" });
    },
    [dispatch, taskLists],
  );

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      if (getDragData(active)?.type !== "task") return;

      const overData = getDragData(over);
      if (!overData || overData.type === "task-list") {
        return;
      }

      dispatch({
        type: "move_task_to_task_list",
        activeTaskId: String(active.id),
        overTaskId: overData.type === "task" ? String(over.id) : undefined,
        targetTaskListId: overData.taskListId,
      });
    },
    [dispatch],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      const activeId = String(active.id);
      const activeData = getDragData(active);
      const overData = getDragData(over);

      resetActiveDrag();

      if (
        activeData?.type === "task-list" &&
        overData?.type === "task-list" &&
        over &&
        activeId !== String(over.id)
      ) {
        dispatch({
          type: "move_task_list",
          activeTaskListId: activeId,
          overTaskListId: String(over.id),
        });
        dispatch({ type: "end_drag" });
        return;
      }

      dispatch({ type: "end_drag" });
    },
    [dispatch, resetActiveDrag],
  );

  const handleDragCancel = useCallback(() => {
    resetActiveDrag();
    dispatch({ type: "cancel_drag" });
  }, [dispatch, resetActiveDrag]);

  const activeDragTask = activeDrag?.type === "task" ? activeDrag.task : null;

  return (
    <DndContext
      id={workspaceId ? `workspace-dnd:${workspaceId}` : "workspace-dnd"}
      sensors={sensors}
      collisionDetection={taskDragCollisionDetection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragCancel={handleDragCancel}
      onDragEnd={handleDragEnd}
    >
      {children}
      <DragOverlay dropAnimation={activeDragTask ? undefined : null}>
        {activeDragTask ? (
          <TaskDragPreview
            task={activeDragTask}
            width={activeDrag?.width ?? undefined}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
