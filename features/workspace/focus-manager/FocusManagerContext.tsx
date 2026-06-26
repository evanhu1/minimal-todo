"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  type PropsWithChildren,
} from "react";

import type { TaskList } from "@/lib/workspace/types";

import { useWorkspaceState } from "@/features/workspace/WorkspaceContext";
import { createTitleFocusTarget, type TodoFocusTarget } from "./focus";

interface FocusHandle {
  focus: (focusTarget: TodoFocusTarget) => void;
}

interface FocusRegistration {
  id: string;
  target: TodoFocusTarget["target"];
}

interface FocusManagerValue {
  moveTitleFocus: (
    args:
      | { currentId: string; direction: "prev" | "next"; type: "horizontal" }
      | {
        currentId: string;
        direction: "up" | "down";
        focusOffset: number;
        type: "vertical";
      },
  ) => void;
  registerFocusable: (
    registration: FocusRegistration,
    handle: FocusHandle,
  ) => () => void;
}

const FocusManagerContext = createContext<FocusManagerValue | null>(null);

interface FocusManagerProviderProps extends PropsWithChildren {
  focusTarget: TodoFocusTarget | null;
  onFocusTargetHandled: (token: number) => void;
}

function getFocusKey(target: FocusRegistration | TodoFocusTarget) {
  return `${target.target}:${target.id}`;
}

export function FocusManagerProvider({
  children,
  focusTarget,
  onFocusTargetHandled,
}: FocusManagerProviderProps) {
  const { taskListOrder, taskLists } = useWorkspaceState();
  const registryRef = useRef(new Map<string, FocusHandle>());
  const pendingFocusTargetRef = useRef<TodoFocusTarget | null>(null);
  const navRef = useRef<{
    taskListOrder: string[];
    taskLists: Record<string, TaskList>;
  }>({ taskListOrder, taskLists });

  useEffect(() => {
    navRef.current = { taskListOrder, taskLists };
  });

  const tryFocusTarget = useCallback((nextFocusTarget: TodoFocusTarget) => {
    const handle = registryRef.current.get(getFocusKey(nextFocusTarget));
    if (!handle) {
      return false;
    }

    handle.focus(nextFocusTarget);

    if (pendingFocusTargetRef.current?.token === nextFocusTarget.token) {
      pendingFocusTargetRef.current = null;
    }

    return true;
  }, []);

  const requestFocus = useCallback(
    (nextFocusTarget: TodoFocusTarget) => {
      pendingFocusTargetRef.current = nextFocusTarget;
      tryFocusTarget(nextFocusTarget);
    },
    [tryFocusTarget],
  );

  const registerFocusable = useCallback(
    (registration: FocusRegistration, handle: FocusHandle) => {
      const key = getFocusKey(registration);
      registryRef.current.set(key, handle);

      const pendingFocusTarget = pendingFocusTargetRef.current;
      if (pendingFocusTarget && getFocusKey(pendingFocusTarget) === key) {
        tryFocusTarget(pendingFocusTarget);
      }

      return () => {
        const currentHandle = registryRef.current.get(key);
        if (currentHandle === handle) {
          registryRef.current.delete(key);
        }
      };
    },
    [tryFocusTarget],
  );

  const moveTitleFocus = useCallback<FocusManagerValue["moveTitleFocus"]>(
    (args) => {
      const target = createTitleFocusTarget({
        ...args,
        taskListOrder: navRef.current.taskListOrder,
        taskLists: navRef.current.taskLists,
      });
      if (target) {
        requestFocus(target);
      }
    },
    [requestFocus],
  );

  useLayoutEffect(() => {
    if (!focusTarget) {
      return;
    }

    requestFocus(focusTarget);
    onFocusTargetHandled(focusTarget.token);
  }, [focusTarget, onFocusTargetHandled, requestFocus]);

  const value = useMemo<FocusManagerValue>(
    () => ({
      moveTitleFocus,
      registerFocusable,
    }),
    [moveTitleFocus, registerFocusable],
  );

  return (
    <FocusManagerContext.Provider value={value}>
      {children}
    </FocusManagerContext.Provider>
  );
}

export function useFocusManager() {
  const value = useContext(FocusManagerContext);
  if (!value) {
    throw new Error("useFocusManager must be used within a FocusManagerProvider.");
  }
  return value;
}
