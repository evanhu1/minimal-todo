"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useImmerReducer } from "use-immer";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import { reducer } from "@/lib/reducer";
import { loadState, saveState } from "@/lib/store";
import { nextOccurrence } from "@/lib/recurrence";
import { emptyState, type AppState, type Task, type TaskRecurrence } from "@/lib/types";
import { newId } from "@/lib/util";
import { AddTask } from "@/components/AddTask";
import { TaskItem } from "@/components/TaskItem";
import { CompletedTasks } from "@/components/CompletedTasks";
import { Toolbar } from "@/components/Toolbar";
import { useReminderNotifications } from "@/components/useReminderNotifications";

export interface TaskHandlers {
  setTitle: (id: string, title: string) => void;
  setBody: (id: string, body: string) => void;
  complete: (task: Task) => void;
  restore: (id: string) => void;
  setSchedule: (id: string, startIso: string | null, recurrence: TaskRecurrence | null) => void;
  remove: (id: string) => void;
}

export function TodoApp() {
  const [state, dispatch] = useImmerReducer(reducer, emptyState());
  const [ready, setReady] = useState(false);

  // Hydrate from IndexedDB once on mount.
  useEffect(() => {
    let cancelled = false;
    loadState().then((loaded) => {
      if (!cancelled) {
        dispatch({ type: "replace_state", state: loaded });
        setReady(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [dispatch]);

  // Persist (debounced) on every change, once hydrated.
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!ready) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => void saveState(state), 250);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [state, ready]);

  useReminderNotifications(state.tasks);

  const handlers: TaskHandlers = useMemo(
    () => ({
      setTitle: (id, title) => dispatch({ type: "update_title", id, title }),
      setBody: (id, body) => dispatch({ type: "update_body", id, body }),
      complete: (task) => {
        const nowIso = new Date().toISOString();
        // A recurring task advances to its next occurrence instead of finishing.
        if (task.scheduledRecurrence && task.scheduledStartIso) {
          const next = nextOccurrence(task.scheduledStartIso, task.scheduledRecurrence, new Date());
          dispatch({ type: "advance_recurrence", id: task.id, nextStartIso: next, nowIso });
        } else {
          dispatch({ type: "set_status", id: task.id, status: "done", nowIso });
        }
      },
      restore: (id) =>
        dispatch({ type: "set_status", id, status: "active", nowIso: new Date().toISOString() }),
      setSchedule: (id, startIso, recurrence) =>
        dispatch({ type: "set_schedule", id, startIso, recurrence }),
      remove: (id) => dispatch({ type: "delete_task", id }),
    }),
    [dispatch],
  );

  const addTask = useCallback(
    (title: string) =>
      dispatch({ type: "add_task", id: newId(), title, nowIso: new Date().toISOString() }),
    [dispatch],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = state.taskOrder.indexOf(String(active.id));
      const newIndex = state.taskOrder.indexOf(String(over.id));
      if (oldIndex < 0 || newIndex < 0) return;
      dispatch({ type: "reorder", order: arrayMove(state.taskOrder, oldIndex, newIndex) });
    },
    [state.taskOrder, dispatch],
  );

  const replaceAll = useCallback(
    (next: AppState) => dispatch({ type: "replace_state", state: next }),
    [dispatch],
  );

  const activeTasks = state.taskOrder.map((id) => state.tasks[id]).filter(Boolean);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">minimal-todo</h1>
        <Toolbar state={state} onImport={replaceAll} />
      </header>

      <AddTask onAdd={addTask} />

      {!ready ? (
        <p className="py-8 text-center text-sm text-neutral-400">Loading…</p>
      ) : activeTasks.length === 0 ? (
        <p className="py-8 text-center text-sm text-neutral-400">
          Nothing yet. Add your first task above.
        </p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={state.taskOrder} strategy={verticalListSortingStrategy}>
            <ul className="flex flex-col gap-1.5">
              {activeTasks.map((task) => (
                <TaskItem key={task.id} task={task} handlers={handlers} />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      <CompletedTasks tasks={state.tasks} handlers={handlers} />
    </div>
  );
}
