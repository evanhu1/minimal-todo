"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { History, Menu, Moon, Redo2, Sun, Undo2 } from "lucide-react";
import { useState } from "react";

import { CompletedTasksView } from "@/features/workspace/completed-tasks/CompletedTasksView";
import {
  useWorkspaceDispatch,
  useWorkspaceState,
} from "@/features/workspace/WorkspaceContext";

const MENU_ITEM_CLASS =
  "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-normal text-foreground outline-none transition-colors hover:bg-secondary focus:bg-secondary focus:outline-none focus-visible:outline-none [WebkitTapHighlightColor:transparent]";
const MENU_ITEM_DISABLED_CLASS =
  `${MENU_ITEM_CLASS} data-[disabled]:cursor-not-allowed data-[disabled]:opacity-40 data-[disabled]:hover:bg-transparent data-[disabled]:focus:bg-transparent`;
const MENU_ITEM_ICON_CLASS = "size-4 shrink-0 text-muted-foreground";

const COMPLETED_TITLE_ID = "completed-tasks-title";

export function HeaderMenu() {
  const [open, setOpen] = useState(false);
  const [completedOpen, setCompletedOpen] = useState(false);
  const { canRedo, canUndo, isLightMode } = useWorkspaceState();
  const dispatch = useWorkspaceDispatch();

  const themeLabel = isLightMode ? "Dark mode" : "Light mode";

  const toggleTheme = () => {
    dispatch({ type: "set_light_mode", isLightMode: !isLightMode });
  };

  const handleUndo = () => {
    if (canUndo) dispatch({ type: "undo" });
  };

  const handleRedo = () => {
    if (canRedo) dispatch({ type: "redo" });
  };

  return (
    <>
      <DropdownMenu.Root open={open} onOpenChange={setOpen}>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            aria-label="Open menu"
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-secondary hover:text-foreground focus:outline-none focus-visible:outline-none [WebkitTapHighlightColor:transparent]"
          >
            <Menu size={16} />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            side="bottom"
            align="end"
            sideOffset={6}
            onCloseAutoFocus={(event) => event.preventDefault()}
            className="z-20 w-52 rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-lg"
          >
            <DropdownMenu.Item
              onSelect={() => setCompletedOpen(true)}
              className={MENU_ITEM_CLASS}
            >
              <History className={MENU_ITEM_ICON_CLASS} />
              <span>Completed tasks</span>
            </DropdownMenu.Item>
            <DropdownMenu.Item
              onSelect={(event) => {
                event.preventDefault();
                toggleTheme();
              }}
              className={MENU_ITEM_CLASS}
            >
              {isLightMode ? (
                <Moon className={MENU_ITEM_ICON_CLASS} />
              ) : (
                <Sun className={MENU_ITEM_ICON_CLASS} />
              )}
              <span>{themeLabel}</span>
            </DropdownMenu.Item>
            <div className="my-1 h-px bg-border" />
            <DropdownMenu.Item
              disabled={!canUndo}
              onSelect={(event) => {
                event.preventDefault();
                handleUndo();
              }}
              className={MENU_ITEM_DISABLED_CLASS}
            >
              <Undo2 className={MENU_ITEM_ICON_CLASS} />
              <span>Undo</span>
            </DropdownMenu.Item>
            <DropdownMenu.Item
              disabled={!canRedo}
              onSelect={(event) => {
                event.preventDefault();
                handleRedo();
              }}
              className={MENU_ITEM_DISABLED_CLASS}
            >
              <Redo2 className={MENU_ITEM_ICON_CLASS} />
              <span>Redo</span>
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
      <CompletedTasksView
        open={completedOpen}
        onClose={() => setCompletedOpen(false)}
        titleId={COMPLETED_TITLE_ID}
      />
    </>
  );
}
