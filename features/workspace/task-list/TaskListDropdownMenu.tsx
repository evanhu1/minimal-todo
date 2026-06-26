"use client";

import * as Popover from "@radix-ui/react-popover";
import { useCallback, useRef, type ReactNode } from "react";

interface TaskListDropdownMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEditTitle?: () => void;
  onDeleteList: () => void;
  /** When false, the list is reserved for Del and the Delete action is hidden. */
  canDelete?: boolean;
  trigger: ReactNode;
}

export function TaskListDropdownMenu({
  open,
  onOpenChange,
  onEditTitle,
  onDeleteList,
  canDelete = true,
  trigger,
}: TaskListDropdownMenuProps) {
  const preventNextCloseAutoFocusRef = useRef(false);

  const handleEditTitle = useCallback(() => {
    preventNextCloseAutoFocusRef.current = true;
    onEditTitle?.();
  }, [onEditTitle]);

  return (
    <Popover.Root open={open} onOpenChange={onOpenChange}>
      <Popover.Trigger asChild>{trigger}</Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="bottom"
          align="end"
          sideOffset={6}
          onCloseAutoFocus={(event) => {
            if (!preventNextCloseAutoFocusRef.current) return;
            preventNextCloseAutoFocusRef.current = false;
            event.preventDefault();
          }}
          className="z-20 w-44 rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-lg"
        >
          {onEditTitle ? (
            <>
              <Popover.Close asChild>
                <button
                  type="button"
                  onClick={handleEditTitle}
                  className="flex w-full rounded-lg px-3 py-2 text-left text-sm outline-none transition-colors hover:bg-secondary focus:outline-none focus-visible:outline-none focus-visible:bg-secondary [WebkitTapHighlightColor:transparent]"
                >
                  Edit list title
                </button>
              </Popover.Close>
              <div className="my-1 h-px bg-border" />
            </>
          ) : null}
          {canDelete ? (
            <Popover.Close asChild>
              <button
                type="button"
                onClick={onDeleteList}
                className="flex w-full rounded-lg px-3 py-2 text-left text-sm text-destructive outline-none transition-colors hover:bg-destructive/10 focus:outline-none focus-visible:outline-none [WebkitTapHighlightColor:transparent]"
              >
                Delete list
              </button>
            </Popover.Close>
          ) : null}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
