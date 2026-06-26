"use client";

import { CSS } from "@dnd-kit/utilities";
import * as Popover from "@radix-ui/react-popover";
import clsx from "clsx";
import { CalendarPlus, Check, GripVertical, Trash2 } from "lucide-react";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { defaultAnimateLayoutChanges, useSortable } from "@dnd-kit/sortable";

import type { Task } from "@/lib/workspace/types";

import { EditableTitle } from "@/features/workspace/EditableTitle";
import { useFocusManager } from "@/features/workspace/focus-manager/FocusManagerContext";
import type { DragData } from "@/features/workspace/drag/types";
import { hasRichTextContent } from "@/lib/workspace/rich-text";
import { hasTaskReminder } from "@/features/workspace/lib/task-reminders/reminder-helpers";
import { useWorkspaceDispatch } from "@/features/workspace/WorkspaceContext";
import { useWorkspaceUiStore } from "@/features/workspace/workspace-state/workspace-ui-store";
import { useTaskOperations } from "./useTaskOperations";
import { TaskRightActions } from "./TaskRightActions";
import { TaskLeftActions } from "./TaskLeftActions";
import { TaskNotesSheet } from "./TaskNotesSheet";
import { TaskReminderMenu } from "./TaskReminderMenu";
import { TASK_STRIKE_ANIMATION_MS } from "./task-strike-animation";
import {
  TASK_SWIPE_SNAP_MS,
  TASK_SWIPE_TRAY_WIDTH_PX,
  useTaskSwipeGesture,
} from "./useTaskSwipeGesture";

interface TaskDragPreviewProps {
  task: Task;
  width?: number;
}

const TASK_FOCUS_SURFACE_SELECTOR = "[data-task-focus-surface='true']";

function isTaskFocusSurfaceTarget(
  target: EventTarget | null,
  taskRoot: HTMLElement,
): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const focusSurface = target.closest(TASK_FOCUS_SURFACE_SELECTOR);
  return Boolean(focusSurface && taskRoot.contains(focusSurface));
}

export const TaskBlock = memo(function TaskBlock({ task }: { task: Task }) {
  const [isFocusedWithin, setIsFocusedWithin] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isReminderOpen, setIsReminderOpen] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const checkTimeoutRef = useRef<number | null>(null);
  const taskNodeRef = useRef<HTMLDivElement | null>(null);
  // The deferred completion body (setTimeout) must act on the freshest task —
  // if the task changes during the strike animation the captured snapshot is
  // stale. Keep a ref updated every render so the timeout reads current state.
  const taskRef = useRef(task);
  useEffect(() => {
    taskRef.current = task;
  });
  const dispatch = useWorkspaceDispatch();
  const { canCreateTasks, createTaskBelow, splitTaskTitle } = useTaskOperations();
  const { moveTitleFocus } = useFocusManager();
  const {
    attributes,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: { type: "task", taskListId: task.taskListId } satisfies DragData,
    animateLayoutChanges: defaultAnimateLayoutChanges,
  });
  const nameRef = useRef<HTMLTextAreaElement>(null);
  const isAllTitlesSelected = useWorkspaceUiStore((s) => s.isAllTitlesSelected);
  const bodyHasContent = hasRichTextContent(task.body);
  const setTaskRef = useCallback(
    (node: HTMLDivElement | null) => {
      taskNodeRef.current = node;
      setNodeRef(node);
    },
    [setNodeRef],
  );

  const openNotes = useCallback(() => {
    setIsNotesOpen(true);
  }, []);

  const handleUpdateTitle = useCallback(
    (title: string) => {
      dispatch({ type: "update_task_title", id: task.id, taskListId: task.taskListId, title });
    },
    [dispatch, task.id, task.taskListId],
  );

  const handleMoveFocus = useCallback(
    (direction: "up" | "down", focusOffset: number) => {
      moveTitleFocus({
        currentId: task.id,
        direction,
        focusOffset,
        type: "vertical",
      });
    },
    [moveTitleFocus, task.id],
  );

  const handleCheck = useCallback(() => {
    if (isCompleting) return;
    setIsCompleting(true);
    if (checkTimeoutRef.current !== null) {
      window.clearTimeout(checkTimeoutRef.current);
    }
    checkTimeoutRef.current = window.setTimeout(() => {
      const latestTask = taskRef.current;
      if (hasTaskReminder(latestTask)) {
        dispatch({
          type: "clear_task_reminder",
          id: latestTask.id,
          taskListId: latestTask.taskListId,
        });
      }
      dispatch({
        type: "mark_task_done",
        id: latestTask.id,
        taskListId: latestTask.taskListId,
      });
    }, TASK_STRIKE_ANIMATION_MS);
  }, [dispatch, isCompleting]);

  const handleNameKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const el = nameRef.current;
      if (!el) return;
      const liveTitle = el.value;
      const selectionStart = el.selectionStart ?? 0;
      const selectionEnd = el.selectionEnd ?? 0;
      const isCollapsedSelection = selectionStart === selectionEnd;
      const atStart = isCollapsedSelection && selectionStart === 0;
      const atEnd = isCollapsedSelection && selectionStart === liveTitle.length;

      if (event.key === "Tab" && !event.shiftKey) {
        event.preventDefault();
        openNotes();
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        if (!canCreateTasks) return;
        dispatch({
          type: "update_task_title",
          id: task.id,
          taskListId: task.taskListId,
          title: liveTitle,
        });

        if (selectionStart === liveTitle.length) {
          createTaskBelow({
            task,
            analytics: { source: "enter_key" },
          });
          return;
        }

        splitTaskTitle({
          task,
          caretOffset: selectionStart,
          analytics: { source: "enter_split" },
        });
        return;
      }

      if (event.key === "Backspace" && atStart) {
        if (liveTitle.length > 0 && bodyHasContent) {
          return;
        }

        event.preventDefault();
        dispatch({
          type: "update_task_title",
          id: task.id,
          taskListId: task.taskListId,
          title: liveTitle,
        });
        dispatch({
          type: "delete_backward",
          id: task.id,
          taskListId: task.taskListId,
        });
        return;
      }

      if (event.key === "Delete" && atEnd) {
        event.preventDefault();
        dispatch({
          type: "update_task_title",
          id: task.id,
          taskListId: task.taskListId,
          title: liveTitle,
        });
        dispatch({
          type: "delete_forward",
          id: task.id,
          taskListId: task.taskListId,
        });
        return;
      }

      if (event.key === "ArrowLeft" && atStart) {
        event.preventDefault();
        moveTitleFocus({
          currentId: task.id,
          direction: "prev",
          type: "horizontal",
        });
        return;
      }

      if (event.key === "ArrowRight" && atEnd) {
        event.preventDefault();
        moveTitleFocus({
          currentId: task.id,
          direction: "next",
          type: "horizontal",
        });
      }
    },
    [
      bodyHasContent,
      canCreateTasks,
      createTaskBelow,
      dispatch,
      moveTitleFocus,
      openNotes,
      splitTaskTitle,
      task,
    ],
  );

  const handleFocus = useCallback((event: React.FocusEvent<HTMLDivElement>) => {
    setIsFocusedWithin(isTaskFocusSurfaceTarget(event.target, event.currentTarget));
  }, []);

  const handleBlur = useCallback(
    (event: React.FocusEvent<HTMLDivElement>) => {
      if (isTaskFocusSurfaceTarget(event.relatedTarget, event.currentTarget)) {
        return;
      }

      setIsFocusedWithin(false);
    },
    [],
  );

  useEffect(() => {
    return () => {
      if (checkTimeoutRef.current !== null) {
        window.clearTimeout(checkTimeoutRef.current);
      }
    };
  }, []);

  const swipe = useTaskSwipeGesture({
    taskId: task.id,
    rowRef: taskNodeRef,
    isDragging,
    isCompleting,
    isReminderOpen,
    onCommitDone: handleCheck,
  });
  const {
    closeTray,
    swipeOffset,
    isSwipeDragging,
    swipeTransition,
    trayInteractive,
    pastDoneThreshold,
    doneProgress,
    doneIconScale,
    touchHandlers,
  } = swipe;

  const handleTrayDelete = useCallback(() => {
    closeTray();
    if (hasTaskReminder(task)) {
      dispatch({
        type: "clear_task_reminder",
        id: task.id,
        taskListId: task.taskListId,
      });
    }
    dispatch({ type: "delete_task", id: task.id, taskListId: task.taskListId });
  }, [closeTray, dispatch, task]);

  const sortableTransform = CSS.Translate.toString(transform);

  return (
    <div
      ref={setTaskRef}
      data-task-id={task.id}
      data-tutorial-target="task-row"
      style={{
        touchAction: "pan-y",
        transform: sortableTransform,
        transition,
      }}
      className={clsx(
        "group/task relative md:-ml-14 md:pl-14",
        isDragging && "z-10 opacity-0",
        isCompleting && "task-completing",
      )}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onTouchStart={(event) => {
        (listeners as { onTouchStart?: (e: React.TouchEvent<HTMLDivElement>) => void } | undefined)?.onTouchStart?.(event);
        touchHandlers.onTouchStart(event);
      }}
      onTouchMove={touchHandlers.onTouchMove}
      onTouchEnd={touchHandlers.onTouchEnd}
      onTouchCancel={touchHandlers.onTouchCancel}
    >
      <div
        aria-hidden="true"
        className={clsx(
          "pointer-events-none absolute inset-0 flex items-center overflow-hidden rounded-xl px-5 md:hidden",
          pastDoneThreshold ? "bg-emerald-600" : "bg-emerald-600/90",
        )}
        style={{
          opacity: doneProgress,
          transition: isSwipeDragging
            ? "background-color 120ms ease-out"
            : `opacity ${TASK_SWIPE_SNAP_MS}ms ease-out, background-color 120ms ease-out`,
        }}
      >
        <Check
          size={22}
          className="text-white"
          style={{
            transform: `scale(${doneIconScale})`,
            transformOrigin: "center",
            transition: isSwipeDragging
              ? "transform 120ms ease-out"
              : `transform ${TASK_SWIPE_SNAP_MS}ms ease-out`,
          }}
        />
      </div>
      <div
        aria-hidden={trayInteractive ? undefined : "true"}
        className="absolute inset-y-0 right-0 flex items-stretch overflow-hidden rounded-r-xl md:hidden"
        style={{
          width: TASK_SWIPE_TRAY_WIDTH_PX,
          opacity: trayInteractive ? 1 : 0,
          pointerEvents: trayInteractive ? "auto" : "none",
          transition: isSwipeDragging
            ? "none"
            : `opacity ${TASK_SWIPE_SNAP_MS}ms ease-out`,
        }}
      >
        <Popover.Root
          open={isReminderOpen}
          onOpenChange={(next) => {
            setIsReminderOpen(next);
            if (!next) closeTray();
          }}
        >
          <Popover.Trigger asChild>
            <button
              type="button"
              aria-label="Set reminder"
              className="flex h-full w-1/2 items-center justify-center bg-accent-orange text-white"
            >
              <CalendarPlus size={20} strokeWidth={2} />
            </button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              side="bottom"
              align="end"
              sideOffset={6}
              className="z-30 w-[320px] rounded-xl border border-border bg-popover p-3 text-popover-foreground shadow-lg"
            >
              <TaskReminderMenu
                task={task}
                onClose={() => {
                  setIsReminderOpen(false);
                  closeTray();
                }}
              />
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
        <button
          type="button"
          aria-label="Delete task"
          onClick={handleTrayDelete}
          className="flex h-full w-1/2 items-center justify-center bg-destructive text-destructive-foreground"
        >
          <Trash2 size={20} strokeWidth={2} />
        </button>
      </div>
      <div
        className="rounded-xl border border-transparent bg-background transition-colors md:-ml-14 md:pl-14"
        style={{
          transform: `translateX(${swipeOffset}px)`,
          transition: swipeTransition,
        }}
      >
        <TaskLeftActions
          task={task}
          isFocusedWithin={isFocusedWithin}
          isMenuOpen={isMenuOpen}
          onMenuOpenChange={setIsMenuOpen}
          attributes={attributes}
          listeners={listeners}
          setActivatorNodeRef={setActivatorNodeRef}
        />
        <div className="flex items-start gap-3 pt-0.5 md:gap-4 md:px-3 md:pt-0">
          <button
            type="button"
            onClick={handleCheck}
            disabled={isCompleting}
            aria-label="Mark task done"
            className={clsx(
              "mt-[4px] flex h-4 w-4 flex-shrink-0 items-center justify-center self-start rounded-[3px] border border-muted-foreground/40 transition-colors",
              isCompleting
                ? "border-muted-foreground/70 bg-muted-foreground/70 text-background"
                : "text-transparent hover:border-foreground hover:text-muted-foreground/60",
            )}
          >
            <Check size={10} strokeWidth={3} />
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-2">
              <div
                data-task-focus-surface="true"
                className={clsx(
                  "touch-no-text-callout relative flex min-w-0 flex-1 cursor-text flex-wrap items-center gap-x-1.5 rounded-[4px]",
                  isAllTitlesSelected &&
                    "bg-[#007AFF]/20 dark:bg-accent-orange/20",
                )}
                onMouseDown={(e) => {
                  if (e.target !== e.currentTarget) return;
                  e.preventDefault();
                  const el = nameRef.current;
                  if (!el) return;
                  el.focus();
                  const len = el.value.length;
                  el.setSelectionRange(len, len);
                }}
              >
                <span className="task-strike-line" aria-hidden="true" />
                <EditableTitle
                  elementRef={nameRef}
                  text={task.title}
                  focusId={task.id}
                  focusTarget="task-title"
                  placeholder="New task"
                  multiline
                  className="min-w-0 flex-1 resize-none overflow-hidden border-0 bg-transparent p-0 text-base font-normal leading-snug text-foreground outline-none placeholder:text-muted-foreground/40 focus:outline-none focus:ring-0"
                  suppressTouchTextSelection
                  onUpdateText={handleUpdateTitle}
                  onMoveFocus={handleMoveFocus}
                  onKeyDown={handleNameKeyDown}
                />
              </div>
              <TaskRightActions task={task} onOpenNotes={openNotes} />
            </div>
          </div>
        </div>
      </div>
      <TaskNotesSheet
        task={task}
        open={isNotesOpen}
        onClose={() => setIsNotesOpen(false)}
      />
    </div>
  );
});

TaskBlock.displayName = "TaskBlock";

export function TaskDragPreview({ task, width }: TaskDragPreviewProps) {
  return (
    <div
      style={width ? { width } : undefined}
      className="pointer-events-none relative rounded-xl border border-border bg-background/95 shadow-2xl md:pl-14"
    >
      <div
        aria-hidden="true"
        className="hidden h-7 w-7 items-center justify-center rounded-md text-muted-foreground md:absolute md:left-7 md:top-0 md:flex md:h-[22px]"
      >
        <GripVertical size={14} />
      </div>
      <div className="flex items-start gap-3 pt-0.5 md:gap-4 md:px-3 md:pt-0">
        <div
          aria-hidden="true"
          className="mt-[4px] h-4 w-4 flex-shrink-0 self-start"
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-1">
            <div className="relative min-w-0 flex-1 pr-2 md:pr-0">
              <div className="block w-full text-base font-normal leading-snug text-foreground [overflow-wrap:anywhere]">
                {task.title || "New task"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
