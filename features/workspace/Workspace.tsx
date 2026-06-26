"use client";

import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Fragment, useCallback, useEffect, useRef } from "react";

import { TodoDndProvider } from "./drag/TodoDndProvider";
import { TaskList } from "./task-list/TaskList";
import { useWorkspaceDispatch, useWorkspaceState } from "./WorkspaceContext";
import { useWorkspaceUiStore } from "./workspace-state/workspace-ui-store";
import { WorkspaceHeader } from "./header/WorkspaceHeader";
import { WorkspaceNotification } from "./ui/WorkspaceNotification";

export function TodosWorkspace() {
  const dispatch = useWorkspaceDispatch();
  const { canRedo, canUndo, taskListOrder, taskLists } =
    useWorkspaceState();
  const workspaceRef = useRef<HTMLElement>(null);
  const visibleTaskListIds = taskListOrder.filter((taskListId) =>
    Boolean(taskLists[taskListId]),
  );

  const addTaskListAtEnd = useCallback(() => {
    dispatch({
      type: "create_task_list",
      id: crypto.randomUUID(),
      insertAtIndex: taskListOrder.length,
      userId: "local-user",
    });
  }, [dispatch, taskListOrder.length]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.altKey) {
        return;
      }
      if (event.key.toLowerCase() !== "z") {
        return;
      }

      const activeElement = document.activeElement as HTMLElement | null;
      const tag = activeElement?.tagName;
      const isTextField = tag === "INPUT" || tag === "TEXTAREA";
      const isProseMirror =
        !!activeElement &&
        (activeElement.isContentEditable ||
          !!activeElement.closest(".ProseMirror"));

      // Tiptap manages its own history — let its keymap handle this.
      if (isProseMirror) {
        return;
      }

      const isRedo = event.shiftKey;
      // Always swallow the event so the browser (e.g. Arc) doesn't
      // reopen a closed tab when our stack is empty.
      event.preventDefault();

      // For native text fields, try native undo/redo first. If the value
      // didn't change, the native stack is exhausted — fall through to
      // workspace history.
      if (isTextField && activeElement) {
        const el = activeElement as HTMLInputElement | HTMLTextAreaElement;
        const before = el.value;
        try {
          // execCommand is deprecated but remains the only cross-browser
          // way to trigger the input's native undo/redo programmatically.
          document.execCommand(isRedo ? "redo" : "undo");
        } catch {
          // fall through to workspace undo
        }
        if (el.value !== before) {
          return;
        }
      }

      if (isRedo) {
        if (canRedo) dispatch({ type: "redo" });
        return;
      }
      if (canUndo) dispatch({ type: "undo" });
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [canRedo, canUndo, dispatch]);

  // Notion-style "select all task titles". Task titles are independent
  // textareas, so the browser can't natively select across them. Instead, a
  // second Cmd/Ctrl+A (the first selects the focused title's own text) enters a
  // block-selection mode: every title is highlighted and Cmd/Ctrl+C copies them
  // all, in on-screen order, joined by newlines — as if they were one document.
  useEffect(() => {
    const { setAllTitlesSelected } = useWorkspaceUiStore.getState();

    const collectTitles = () => {
      const root = workspaceRef.current;
      if (!root) return [] as HTMLTextAreaElement[];
      return Array.from(
        root.querySelectorAll<HTMLTextAreaElement>("[data-task-id] textarea"),
      );
    };

    const isTaskTitle = (node: EventTarget | null): node is HTMLTextAreaElement =>
      node instanceof HTMLTextAreaElement &&
      Boolean(workspaceRef.current?.contains(node)) &&
      Boolean(node.closest("[data-task-id]"));

    const dismiss = () => {
      if (useWorkspaceUiStore.getState().isAllTitlesSelected) {
        setAllTitlesSelected(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      const meta = event.metaKey || event.ctrlKey;
      const isSelected = useWorkspaceUiStore.getState().isAllTitlesSelected;

      if (isSelected) {
        if (meta && !event.altKey && event.key.toLowerCase() === "c") {
          event.preventDefault();
          const text = collectTitles()
            .map((el) => el.value)
            .join("\n");
          void navigator.clipboard?.writeText(text);
          return;
        }
        // A repeat Cmd/Ctrl+A keeps the whole selection rather than letting the
        // browser select the entire page.
        if (meta && !event.altKey && event.key.toLowerCase() === "a") {
          event.preventDefault();
          return;
        }
        // Bare modifier presses don't dismiss; any other key does.
        if (!["Shift", "Meta", "Control", "Alt"].includes(event.key)) {
          dismiss();
        }
        return;
      }

      if (
        meta &&
        !event.altKey &&
        !event.shiftKey &&
        event.key.toLowerCase() === "a" &&
        isTaskTitle(document.activeElement)
      ) {
        const el = document.activeElement as HTMLTextAreaElement;
        const fullySelected =
          el.selectionStart === 0 && el.selectionEnd === el.value.length;
        // First press: let the browser select this title's own text. Second
        // press (already fully selected): expand to all titles.
        if (fullySelected) {
          event.preventDefault();
          el.blur();
          setAllTitlesSelected(true);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("mousedown", dismiss);
    window.addEventListener("touchstart", dismiss);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("mousedown", dismiss);
      window.removeEventListener("touchstart", dismiss);
    };
  }, []);

  return (
    <div className="flex flex-col relative min-h-screen bg-background font-sans text-foreground selection:bg-[#007AFF]/20 dark:selection:bg-accent-orange/20 pb-[30vh] md:pb-[45vh]">
      <WorkspaceHeader />
      <WorkspaceNotification />

      <main ref={workspaceRef} className="mx-auto w-full max-w-4xl px-6 md:px-12">
        <section className="min-w-0">
          <TodoDndProvider>
            <SortableContext
              items={visibleTaskListIds}
              strategy={verticalListSortingStrategy}
            >
              <div className="flex flex-col">
                {visibleTaskListIds.map((taskListId, index) => {
                  const list = taskLists[taskListId];
                  if (!list) return null;
                  const isLast = index === visibleTaskListIds.length - 1;
                  const marginClassName = isLast
                    ? ""
                    : list.isCollapsed
                      ? "mb-4 md:mb-4"
                      : "mb-10 md:mb-10";

                  return (
                    <Fragment key={taskListId}>
                      <TaskList taskListId={taskListId} />
                      {marginClassName ? (
                        <div aria-hidden="true" className={marginClassName} />
                      ) : null}
                    </Fragment>
                  );
                })}
              </div>
            </SortableContext>
          </TodoDndProvider>

          <div className="mt-4 min-h-5 md:-ml-14 md:pl-14">
            <button
              type="button"
              onClick={addTaskListAtEnd}
              className="py-1.5 text-sm text-muted-foreground/60 transition-colors hover:text-muted-foreground"
            >
              + Add list
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
