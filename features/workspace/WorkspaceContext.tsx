"use client";

import {
  type Dispatch,
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { useImmerReducer } from "use-immer";

import type {
  TaskList,
  WorkspaceData,
} from "@/lib/workspace/types";
import { loadWorkspace, saveWorkspace } from "@/lib/workspace/local-store";
import { seedWorkspace } from "@/lib/workspace/seed";
import {
  createInitialWorkspaceReducerState,
  type WorkspaceReducerAction,
  workspaceReducer,
} from "@/lib/workspace/reducer";

import { FocusManagerProvider } from "./focus-manager/FocusManagerContext";

interface WorkspaceStateValue {
  canRedo: boolean;
  canUndo: boolean;
  workspaceData: WorkspaceData;
  isLightMode: boolean;
  taskListOrder: string[];
  taskLists: Record<string, TaskList>;
  workspaceId: string;
  isDragging: boolean;
}

const WorkspaceStateContext = createContext<WorkspaceStateValue | null>(null);
const WorkspaceDispatchContext =
  createContext<Dispatch<WorkspaceReducerAction> | null>(null);

const SAVE_DEBOUNCE_MS = 250;

interface WorkspaceProviderProps {
  children: ReactNode;
}

export function WorkspaceProvider({ children }: WorkspaceProviderProps) {
  const [workspaceState, dispatch] = useImmerReducer(
    workspaceReducer,
    { workspaceData: seedWorkspace() },
    createInitialWorkspaceReducerState,
  );

  // Gate persistence until the initial IndexedDB load attempt resolves so the
  // seeded default can't clobber previously stored data.
  const hydratedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    void loadWorkspace().then((stored) => {
      if (cancelled) return;
      if (stored) {
        dispatch({ type: "hydrate_workspace_data", workspaceData: stored });
      }
      hydratedRef.current = true;
    });
    return () => {
      cancelled = true;
    };
  }, [dispatch]);

  const { workspaceData } = workspaceState;

  useEffect(() => {
    if (!hydratedRef.current) return;
    const handle = window.setTimeout(() => {
      void saveWorkspace(workspaceData);
    }, SAVE_DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [workspaceData]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", !workspaceData.isLightMode);
  }, [workspaceData.isLightMode]);

  const stateValue = useMemo<WorkspaceStateValue>(
    () => ({
      canRedo: workspaceState.redoStack.length > 0,
      canUndo: workspaceState.undoStack.length > 0,
      workspaceData: workspaceState.workspaceData,
      isLightMode: workspaceState.workspaceData.isLightMode,
      taskListOrder: workspaceState.workspaceData.taskListOrder,
      taskLists: workspaceState.workspaceData.taskLists,
      workspaceId: "local",
      isDragging: workspaceState.dragSnapshot !== null,
    }),
    [
      workspaceState.redoStack,
      workspaceState.undoStack,
      workspaceState.workspaceData,
      workspaceState.dragSnapshot,
    ],
  );

  return (
    <WorkspaceDispatchContext.Provider value={dispatch}>
      <WorkspaceStateContext.Provider value={stateValue}>
        <FocusManagerProvider
          focusTarget={workspaceState.focusTarget}
          onFocusTargetHandled={(token) =>
            dispatch({ type: "clear_focus_target", token })}
        >
          {children}
        </FocusManagerProvider>
      </WorkspaceStateContext.Provider>
    </WorkspaceDispatchContext.Provider>
  );
}

export function useWorkspaceState() {
  const value = useContext(WorkspaceStateContext);
  if (!value) {
    throw new Error("useWorkspaceState must be used within a WorkspaceProvider.");
  }
  return value;
}

export function useWorkspaceDispatch() {
  const value = useContext(WorkspaceDispatchContext);
  if (!value) {
    throw new Error(
      "useWorkspaceDispatch must be used within a WorkspaceProvider.",
    );
  }
  return value;
}
