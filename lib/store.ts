// Local persistence. The source of truth lives in the browser's IndexedDB via
// idb-keyval — no server, no database, no network. This is the entire backend.

import { get, set } from "idb-keyval";

import {
  emptyState,
  SCHEMA_VERSION,
  type AppState,
  type PersistedState,
} from "@/lib/types";

const STORAGE_KEY = "minimal-todo:state";

/** Read persisted state, or an empty list on first run. Tolerant of garbage. */
export async function loadState(): Promise<AppState> {
  try {
    const raw = (await get(STORAGE_KEY)) as PersistedState | undefined;
    if (raw && typeof raw === "object" && raw.state) {
      // Future schema migrations would branch on raw.version here.
      return normalize(raw.state);
    }
  } catch {
    // IndexedDB unavailable (private mode, etc.) — fall back to an empty list.
  }
  return emptyState();
}

/** Persist state. Called debounced from the app on every change. */
export async function saveState(state: AppState): Promise<void> {
  const payload: PersistedState = { version: SCHEMA_VERSION, state };
  try {
    await set(STORAGE_KEY, payload);
  } catch {
    // Best-effort: a failed write just means this change isn't durable yet.
  }
}

/** Serialize the whole list to a JSON string for the Export button. */
export function exportJson(state: AppState): string {
  const payload: PersistedState = { version: SCHEMA_VERSION, state };
  return JSON.stringify(payload, null, 2);
}

/** Parse an imported JSON file back into AppState, or throw on bad input. */
export function importJson(text: string): AppState {
  const parsed = JSON.parse(text) as PersistedState | AppState;
  const state = "state" in parsed ? parsed.state : (parsed as AppState);
  if (!state || typeof state !== "object" || !Array.isArray(state.taskOrder)) {
    throw new Error("Not a valid minimal-todo export.");
  }
  return normalize(state);
}

// Guard against malformed persisted/imported data: drop dangling order ids and
// re-append any orphaned active tasks so the UI never references a missing task.
function normalize(state: AppState): AppState {
  const tasks = state.tasks ?? {};
  const order = (state.taskOrder ?? []).filter((id) => tasks[id]?.status === "active");
  const seen = new Set(order);
  for (const [id, task] of Object.entries(tasks)) {
    if (task.status === "active" && !seen.has(id)) order.push(id);
  }
  return { taskOrder: order, tasks };
}
