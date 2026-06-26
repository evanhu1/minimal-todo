"use client";

import { useCallback } from "react";

import type { Task } from "@/lib/workspace/types";
import { AppDialogSheet } from "@/features/workspace/ui/AppDialogSheet";
import { RichTextEditor } from "@/features/workspace/text-editor/RichTextEditor";
import { useWorkspaceDispatch } from "@/features/workspace/WorkspaceContext";

interface TaskNotesSheetProps {
  task: Task;
  open: boolean;
  onClose: () => void;
}

export function TaskNotesSheet({ task, open, onClose }: TaskNotesSheetProps) {
  const dispatch = useWorkspaceDispatch();
  const titleId = `task-notes-${task.id}`;

  const handleUpdateBody = useCallback(
    (body: string) => {
      dispatch({
        type: "update_task_body",
        id: task.id,
        taskListId: task.taskListId,
        body,
      });
    },
    [dispatch, task.id, task.taskListId],
  );

  return (
    <AppDialogSheet open={open} onClose={onClose} titleId={titleId}>
      <div className="flex flex-col gap-3 bg-background text-foreground">
        <h2
          id={titleId}
          className="text-base font-medium leading-snug text-foreground [overflow-wrap:anywhere]"
        >
          {task.title || "New task"}
        </h2>
        <RichTextEditor content={task.body} onUpdate={handleUpdateBody} />
      </div>
    </AppDialogSheet>
  );
}
