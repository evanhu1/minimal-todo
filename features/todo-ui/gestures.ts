"use client";

import { useSyncExternalStore } from "react";

const coarsePointer = "(pointer: coarse)";

export function hasCoarsePointer() {
  return typeof window !== "undefined" && !!window.matchMedia?.(coarsePointer).matches;
}

function subscribe(onChange: () => void) {
  const query = window.matchMedia?.(coarsePointer);
  query?.addEventListener("change", onChange);
  return () => query?.removeEventListener("change", onChange);
}

export function useCoarsePointer() {
  return useSyncExternalStore(subscribe, hasCoarsePointer, () => false);
}

/**
 * Allow drags from the row or its unfocused title shield. Controls handle their
 * own touches, and a portaled notes sheet can bubble events from outside the row.
 */
export function canStartRowDrag(row: Element, target: EventTarget | null) {
  return target instanceof Element && row.contains(target) &&
    !target.closest('input, textarea, select, button, a[href], [contenteditable]:not([contenteditable="false"])');
}
