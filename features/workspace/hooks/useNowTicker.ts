"use client";

import { useState, useSyncExternalStore } from "react";

const DEFAULT_INTERVAL_MS = 60_000;

// Returns `null` on the server and during the first client render so any
// time-derived text stays identical across SSR -> first client paint (avoids
// the hydration mismatch from seeding with the server wall-clock and then
// re-seeding with the browser clock/timezone). After mount the real `now`
// arrives and ticks on `intervalMs`. Consumers must render a stable placeholder
// while it is `null`.
//
// Implemented with useSyncExternalStore so the server/client divergence is
// expressed through the server snapshot (null) rather than a post-mount
// setState — this keeps React from flagging a hydration mismatch and sidesteps
// the set-state-in-effect lint rule.
export function useNowTicker(intervalMs: number = DEFAULT_INTERVAL_MS): Date | null {
  const [store] = useState(() => createNowTickerStore(intervalMs));
  return useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  );
}

function createNowTickerStore(intervalMs: number) {
  // Cached snapshot: stays referentially stable between ticks so
  // useSyncExternalStore doesn't loop. Null until the first subscription.
  let snapshot: Date | null = null;
  return {
    subscribe(onStoreChange: () => void): () => void {
      snapshot = new Date();
      onStoreChange();
      const id = window.setInterval(() => {
        snapshot = new Date();
        onStoreChange();
      }, intervalMs);
      return () => window.clearInterval(id);
    },
    getSnapshot(): Date | null {
      return snapshot;
    },
    getServerSnapshot(): Date | null {
      return null;
    },
  };
}
