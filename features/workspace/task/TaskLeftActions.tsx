"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import * as Tooltip from "@radix-ui/react-tooltip";
import clsx from "clsx";
import { ChevronRight, Plus } from "lucide-react";
import { useCallback, useMemo, useState, type MouseEvent } from "react";
import type { DraggableAttributes } from "@dnd-kit/core";
import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";

import type { Task } from "@/lib/workspace/types";

import { DragHandleButton } from "@/features/workspace/DragHandleButton";
import {
  useWorkspaceDispatch,
  useWorkspaceState,
} from "@/features/workspace/WorkspaceContext";
import { useTaskOperations } from "./useTaskOperations";

interface TaskLeftActionsProps {
  task: Task;
  isFocusedWithin: boolean;
  isMenuOpen: boolean;
  onMenuOpenChange: (open: boolean) => void;
  attributes: DraggableAttributes;
  listeners: SyntheticListenerMap | undefined;
  setActivatorNodeRef: (node: HTMLElement | null) => void;
}

export function TaskLeftActions({
  task,
  isFocusedWithin,
  isMenuOpen,
  onMenuOpenChange,
  attributes,
  listeners,
  setActivatorNodeRef,
}: TaskLeftActionsProps) {
  const dispatch = useWorkspaceDispatch();
  const { taskListOrder, taskLists } = useWorkspaceState();
  const { canCreateTasks, createTaskAbove, createTaskBelow } = useTaskOperations();
  const [optionsTooltipOpen, setOptionsTooltipOpen] = useState(false);
  const [suppressOptionsTooltip, setSuppressOptionsTooltip] = useState(false);
  const moveTargetLists = useMemo(
    () =>
      taskListOrder
        .map((id) => taskLists[id])
        .filter((taskList) => taskList && taskList.id !== task.taskListId),
    [task.taskListId, taskListOrder, taskLists],
  );

  const handleCreatePlus = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      if (!canCreateTasks) return;
      const above = event.altKey;
      if (above) {
        createTaskAbove({
          task,
          analytics: { source: "plus_button_above" },
        });
      } else {
        createTaskBelow({
          task,
          analytics: { source: "plus_button_below" },
        });
      }
      event.currentTarget.blur();
    },
    [canCreateTasks, createTaskAbove, createTaskBelow, task],
  );

  const handleDeleteTask = useCallback(() => {
    dispatch({ type: "delete_task", id: task.id, taskListId: task.taskListId });
  }, [dispatch, task.id, task.taskListId]);

  const handleMoveTask = useCallback(
    (targetTaskListId: string) => {
      dispatch({
        type: "move_task_to_task_list",
        activeTaskId: task.id,
        targetTaskListId,
        targetInsertIndex: 0,
      });
    },
    [dispatch, task.id],
  );

  const handleMenuOpenChange = useCallback(
    (open: boolean) => {
      setOptionsTooltipOpen(false);
      setSuppressOptionsTooltip(true);
      onMenuOpenChange(open);
    },
    [onMenuOpenChange],
  );

  const handleOptionsTooltipOpenChange = useCallback(
    (open: boolean) => {
      setOptionsTooltipOpen(isMenuOpen || suppressOptionsTooltip ? false : open);
    },
    [isMenuOpen, suppressOptionsTooltip],
  );

  const handleOptionsPointerEnter = useCallback(() => {
    if (!isMenuOpen) {
      setSuppressOptionsTooltip(false);
    }
  }, [isMenuOpen]);

  const handleOptionsPointerLeave = useCallback(() => {
    setOptionsTooltipOpen(false);
    setSuppressOptionsTooltip(false);
  }, []);

  const handleOptionsBlur = useCallback(() => {
    setOptionsTooltipOpen(false);
  }, []);

  const handleMenuTriggerClick = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    event.currentTarget.blur();
    handleMenuOpenChange(!isMenuOpen);
  }, [handleMenuOpenChange, isMenuOpen]);

  return (
    <Tooltip.Provider delayDuration={400} disableHoverableContent>
      <div className="absolute left-1 top-0 hidden md:flex">
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <button
              type="button"
              onClick={handleCreatePlus}
              aria-label="Add task (option-click to add above)"
              className={clsx(
                "h-6 w-6 cursor-pointer items-center justify-center rounded-sm text-muted-foreground outline-none transition-colors hover:bg-secondary hover:text-foreground focus:outline-none focus-visible:outline-none [WebkitTapHighlightColor:transparent]",
                isFocusedWithin || isMenuOpen
                  ? "flex"
                  : "hidden group-hover/task:flex",
              )}
            >
              <Plus size={16} />
            </button>
          </Tooltip.Trigger>
          <TooltipContent>
            <span className="text-popover-foreground">Click</span>
            <span className="text-popover-foreground/60"> to add task below</span>
            <br />
            <span className="text-popover-foreground">Option-click</span>
            <span className="text-popover-foreground/60"> to add above</span>
          </TooltipContent>
        </Tooltip.Root>

        <DropdownMenu.Root open={isMenuOpen} onOpenChange={handleMenuOpenChange}>
          <Tooltip.Root
            open={isMenuOpen || suppressOptionsTooltip ? false : optionsTooltipOpen}
            onOpenChange={handleOptionsTooltipOpenChange}
          >
            <Tooltip.Trigger asChild>
              <DragHandleButton
                ref={setActivatorNodeRef}
                aria-label="Task options"
                hiddenClassName="hidden group-hover/task:flex"
                visibleClassName="flex"
                isVisible={isFocusedWithin || isMenuOpen}
                {...attributes}
                {...listeners}
                onBlur={handleOptionsBlur}
                onClick={handleMenuTriggerClick}
                onPointerEnter={handleOptionsPointerEnter}
                onPointerLeave={handleOptionsPointerLeave}
              />
            </Tooltip.Trigger>
            <TooltipContent>
              <span className="text-popover-foreground">Drag</span>
              <span className="text-popover-foreground/60"> to move</span>
              <br />
              <span className="text-popover-foreground">Click</span>
              <span className="text-popover-foreground/60"> to open menu</span>
            </TooltipContent>
          </Tooltip.Root>
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              aria-hidden="true"
              tabIndex={-1}
              className="pointer-events-none absolute left-6 top-0 h-6 w-4 opacity-0"
            />
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              side="bottom"
              align="end"
              sideOffset={6}
              onCloseAutoFocus={(event) => event.preventDefault()}
              className="z-20 w-48 rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-lg"
            >
              <DropdownMenu.Sub>
                <DropdownMenu.SubTrigger className="flex w-full cursor-default items-center justify-between rounded-lg px-3 py-1 text-left text-sm outline-none transition-colors hover:bg-secondary focus:bg-secondary focus:outline-none data-[state=open]:bg-secondary [WebkitTapHighlightColor:transparent]">
                  Move to
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={2} />
                </DropdownMenu.SubTrigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.SubContent
                    sideOffset={8}
                    alignOffset={-6}
                    className="z-20 min-w-44 max-w-64 rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-lg"
                  >
                    {moveTargetLists.length > 0 ? (
                      moveTargetLists.map((targetList) => (
                        <DropdownMenu.Item
                          key={targetList.id}
                          onSelect={() => handleMoveTask(targetList.id)}
                          className="block cursor-default truncate rounded-lg px-3 py-1 text-left text-sm outline-none transition-colors hover:bg-secondary focus:bg-secondary focus:outline-none [WebkitTapHighlightColor:transparent]"
                        >
                          {targetList.title.trim() || "Untitled list"}
                        </DropdownMenu.Item>
                      ))
                    ) : (
                      <DropdownMenu.Item
                        disabled
                        className="block cursor-default rounded-lg px-3 py-1 text-left text-sm text-muted-foreground outline-none data-[disabled]:opacity-60"
                      >
                        No other lists
                      </DropdownMenu.Item>
                    )}
                  </DropdownMenu.SubContent>
                </DropdownMenu.Portal>
              </DropdownMenu.Sub>
              <DropdownMenu.Separator className="my-1 h-px bg-border" />
              <DropdownMenu.Item
                onSelect={handleDeleteTask}
                className="flex w-full cursor-default rounded-lg px-3 py-1 text-left text-sm text-destructive outline-none transition-colors hover:bg-destructive/10 focus:bg-destructive/10 focus:outline-none [WebkitTapHighlightColor:transparent]"
              >
                Delete task
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </Tooltip.Provider>
  );
}

function TooltipContent({ children }: { children: React.ReactNode }) {
  return (
    <Tooltip.Portal>
      <Tooltip.Content
        side="bottom"
        sideOffset={6}
        className="z-50 rounded-md bg-popover px-2.5 py-1.5 text-[12px] leading-snug text-popover-foreground shadow-lg border border-border"
      >
        {children}
      </Tooltip.Content>
    </Tooltip.Portal>
  );
}
