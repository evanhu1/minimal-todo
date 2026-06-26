"use client";

import { create } from "zustand";

export interface WorkspaceNotification {
  id: number;
  message: string;
}

interface WorkspaceUiState {
  notification: WorkspaceNotification | null;
  // True while a Notion-style "select all task titles" block selection is
  // active (second Cmd/Ctrl+A). Every task title renders a selection highlight
  // and Cmd/Ctrl+C copies all titles joined by newlines.
  isAllTitlesSelected: boolean;
  showNotification: (message: string) => void;
  dismissNotification: (id: number) => void;
  setAllTitlesSelected: (selected: boolean) => void;
}

export const useWorkspaceUiStore = create<WorkspaceUiState>((set) => ({
  notification: null,
  isAllTitlesSelected: false,
  showNotification: (message) =>
    set({
      notification: { id: Date.now(), message },
    }),
  dismissNotification: (id) =>
    set((state) => ({
      notification:
        state.notification?.id === id ? null : state.notification,
    })),
  setAllTitlesSelected: (selected) =>
    set((state) =>
      state.isAllTitlesSelected === selected
        ? state
        : { isAllTitlesSelected: selected },
    ),
}));

export function showWorkspaceNotification(message: string) {
  useWorkspaceUiStore.getState().showNotification(message);
}
