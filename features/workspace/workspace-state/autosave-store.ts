"use client";

import { create } from "zustand";

export interface AutosaveStoreData {
  isRetrying: boolean;
  isSaving: boolean;
  retryAttempt: number;
  writeErrorMessage: string | null;
}

interface AutosaveStore extends AutosaveStoreData {
  setStatus: (patch: Partial<AutosaveStoreData>) => void;
  reset: () => void;
}

const INITIAL: AutosaveStoreData = {
  isRetrying: false,
  isSaving: false,
  retryAttempt: 0,
  writeErrorMessage: null,
};

export const useAutosaveStore = create<AutosaveStore>((set) => ({
  ...INITIAL,
  setStatus: (patch) => set(patch),
  reset: () => set(INITIAL),
}));
