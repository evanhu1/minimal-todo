"use client";

import {
  defaultAnimateLayoutChanges,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import clsx from "clsx";
import { MoreVertical } from "lucide-react";
import { useCallback, useRef, useState } from "react";


import { DragHandleButton } from "@/features/workspace/DragHandleButton";
import { EditableTitle } from "@/features/workspace/EditableTitle";
import { useFocusManager } from "@/features/workspace/focus-manager/FocusManagerContext";
import type { DragData } from "@/features/workspace/drag/types";
import { useWorkspaceState } from "@/features/workspace/WorkspaceContext";
import { useTaskOperations } from "@/features/workspace/task/useTaskOperations";
import { CollapseChevron } from "./CollapseChevron";
import { TaskListBody } from "./TaskListBody";
import { TaskListDropdownMenu } from "./TaskListDropdownMenu";
import { useCollapsedTaskListDragExpand } from "./useCollapsedTaskListDragExpand";
import { useTaskListOperations } from "./useTaskListOperations";

export function TaskList({ taskListId }: { taskListId: string }) {
  const [isHeaderFocusedWithin, setIsHeaderFocusedWithin] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMobileTitleEditing, setIsMobileTitleEditing] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { taskLists } = useWorkspaceState();
  const { addTask } = useTaskOperations();
  const {
    deleteTaskList,
    toggleTaskListCollapse,
    updateTaskListTitle,
  } = useTaskListOperations();
  const { moveTitleFocus } = useFocusManager();

  const taskList = taskLists[taskListId];
  const orderedTaskIds = taskList?.taskOrder ?? [];
  const isCollapsed = Boolean(taskList?.isCollapsed);
  const {
    hoverZoneRef,
    isTaskDragOverCollapsedList,
  } = useCollapsedTaskListDragExpand(taskListId, isCollapsed);

  const taskCount = orderedTaskIds.length;
  const {
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: taskListId,
    data: { type: "task-list" } satisfies DragData,
    animateLayoutChanges: defaultAnimateLayoutChanges,
  });
  const titleRef = useRef<HTMLInputElement>(null);
  const isHandleVisible = isHeaderFocusedWithin;

  const handleUpdateTitle = useCallback(
    (title: string) => {
      updateTaskListTitle({ id: taskListId, title });
    },
    [taskListId, updateTaskListTitle],
  );

  const handleMoveFocus = useCallback(
    (direction: "up" | "down", focusOffset: number) => {
      moveTitleFocus({
        currentId: taskListId,
        direction,
        focusOffset,
        type: "vertical",
      });
    },
    [moveTitleFocus, taskListId],
  );

  const handleAddTask = useCallback(
    (title?: string) => {
      addTask({
        taskListId,
        title,
        focus: true,
        analytics: { source: "list_add_button" },
      });
    },
    [addTask, taskListId],
  );

  const handleToggleCollapse = useCallback(
    () => {
      toggleTaskListCollapse({ id: taskListId });
    },
    [taskListId, toggleTaskListCollapse],
  );

  const focusTitleForEdit = useCallback(() => {
    setIsMobileTitleEditing(true);

    const titleElement = titleRef.current;
    if (!titleElement) return;

    titleElement.focus({ preventScroll: true });
    const titleLength = titleElement.value.length;
    titleElement.setSelectionRange(titleLength, titleLength);
  }, []);

  const handleDeleteTaskList = useCallback(() => {
    const list = taskLists[taskListId];
    if (!list) {
      return;
    }
    const taskCount = list.taskOrder.length;
    const isEmptyTaskList = list.title.trim().length === 0 && taskCount === 0;
    const shouldConfirm = !isEmptyTaskList;

    if (shouldConfirm) {
      const name = list.title.trim() || "Untitled list";
      if (!window.confirm(`Delete list "${name}" and all of its tasks?`)) {
        return;
      }
    }

    deleteTaskList({ id: taskListId });
  },
    [deleteTaskList, taskListId, taskLists],
  );

  const handleTitleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const title = event.currentTarget.value;
      const selectionStart = event.currentTarget.selectionStart ?? 0;
      const selectionEnd = event.currentTarget.selectionEnd ?? 0;
      const isCollapsedSelection = selectionStart === selectionEnd;
      const atStart = isCollapsedSelection && selectionStart === 0;
      const atEnd = isCollapsedSelection && selectionStart === title.length;

      if (event.key === "Enter") {
        event.preventDefault();
        if (taskCount === 0) {
          handleAddTask();
        }
      }

      if (event.key === "Backspace" && atStart && title.trim().length === 0) {
        event.preventDefault();
        handleDeleteTaskList();
        return;
      }

      if (event.key === "ArrowLeft" && atStart) {
        event.preventDefault();
        moveTitleFocus({
          currentId: taskListId,
          direction: "prev",
          type: "horizontal",
        });
      }

      if (event.key === "ArrowRight" && atEnd) {
        event.preventDefault();
        moveTitleFocus({
          currentId: taskListId,
          direction: "next",
          type: "horizontal",
        });
      }
    },
    [handleAddTask, handleDeleteTaskList, moveTitleFocus, taskCount, taskListId],
  );

  if (!taskList) {
    return null;
  }

  const listTitle = taskList.title.trim() || "list";
  const isShowingCollapsedDropAffordance =
    isCollapsed && isTaskDragOverCollapsedList;

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
      }}
      className={clsx("relative", isDragging && "z-10 opacity-80")}
    >
      <div
        className="group/project-header relative md:-ml-14 md:pl-14"
        onFocus={() => setIsHeaderFocusedWithin(true)}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
            setIsHeaderFocusedWithin(false);
          }
        }}
        style={{ touchAction: "pan-y" }}
        {...listeners}
      >
        {isCollapsed ? (
          <div
            ref={hoverZoneRef}
            aria-hidden="true"
            className={clsx(
              "pointer-events-none absolute -left-2 -right-2 -top-2 -bottom-2 z-0 rounded-lg transition-colors",
              isShowingCollapsedDropAffordance && "bg-accent/50",
            )}
          />
        ) : null}
        <TaskListDropdownMenu
          open={isMenuOpen}
          onOpenChange={setIsMenuOpen}
          onDeleteList={handleDeleteTaskList}
          canDelete={true}
          trigger={
            <DragHandleButton
              aria-label="List options"
              hiddenClassName="hidden md:group-hover/project-header:flex"
              isVisible={isHandleVisible || isMenuOpen}
              visibleClassName="hidden md:flex"
              className="md:absolute md:left-1 md:top-0 md:h-[22px]"
            />
          }
        />
        <div className="relative z-10 mb-2 flex items-center gap-1">
          <CollapseChevron
            isCollapsed={isCollapsed}
            onToggle={handleToggleCollapse}
            ariaLabel={
              isCollapsed ? `Expand ${listTitle}` : `Collapse ${listTitle}`
            }
          />
          <div className="relative min-w-0 flex-1">
            <EditableTitle
              elementRef={titleRef}
              text={taskList.title}
              focusId={taskListId}
              focusTarget="task-list-title"
              placeholder="New list"
              className="w-full min-w-0 border-0 font-medium bg-transparent p-0 text-lg leading-tight text-foreground outline-none placeholder:text-muted-foreground/40 focus:outline-none focus:ring-0"
              onFocusChange={setIsMobileTitleEditing}
              onUpdateText={handleUpdateTitle}
              onMoveFocus={handleMoveFocus}
              onKeyDown={handleTitleKeyDown}
            />
            {!isMobileTitleEditing ? (
              <button
                type="button"
                aria-label={
                  isCollapsed ? `Expand ${listTitle}` : `Collapse ${listTitle}`
                }
                aria-expanded={!isCollapsed}
                onClick={(event) => {
                  event.stopPropagation();
                  handleToggleCollapse();
                }}
                onPointerDown={(event) => event.stopPropagation()}
                className="absolute inset-0 z-[2] block cursor-pointer bg-transparent [WebkitTapHighlightColor:transparent] md:hidden"
              />
            ) : null}
            {taskCount > 0 ? (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 left-0 right-0 flex items-center overflow-hidden"
              >
                <span className="invisible min-w-0 shrink truncate whitespace-pre text-lg font-semibold leading-tight">
                  {taskList.title || "New list"}
                </span>
                <span className="ml-2 shrink-0 text-sm font-medium leading-none text-muted-foreground/60">
                  {taskCount}
                </span>
              </div>
            ) : null}
          </div>
          <TaskListDropdownMenu
            open={isMobileMenuOpen}
            onOpenChange={setIsMobileMenuOpen}
            onEditTitle={focusTitleForEdit}
            onDeleteList={handleDeleteTaskList}
            canDelete={true}
            trigger={
              <button
                type="button"
                aria-label="List options"
                className="-mr-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-secondary hover:text-foreground focus:outline-none focus-visible:outline-none [WebkitTapHighlightColor:transparent] md:hidden"
              >
                <MoreVertical size={16} />
              </button>
            }
          />
        </div>
      </div>

      {isCollapsed ? null : (
        <TaskListBody
          taskListId={taskListId}
          taskOrder={orderedTaskIds}
          tasks={taskList.tasks}
          onAddTask={handleAddTask}
        />
      )}
    </div>
  );
}
