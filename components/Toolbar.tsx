"use client";

import { useRef } from "react";
import { Download, Upload } from "lucide-react";

import type { AppState } from "@/lib/types";
import { exportJson, importJson } from "@/lib/store";

// Export/import are the backup-and-migrate story for a local-only app: there is
// no server to sync to, so a JSON file is how data moves between browsers.
export function Toolbar({
  state,
  onImport,
}: {
  state: AppState;
  onImport: (next: AppState) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  function download() {
    const blob = new Blob([exportJson(state)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `minimal-todo-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const next = importJson(await file.text());
      if (
        Object.keys(state.tasks).length === 0 ||
        window.confirm("Replace your current tasks with the imported file?")
      ) {
        onImport(next);
      }
    } catch {
      window.alert("That file isn't a valid minimal-todo export.");
    }
  }

  return (
    <div className="flex items-center gap-1 text-neutral-400">
      <button
        onClick={download}
        title="Export tasks to a JSON file"
        aria-label="Export"
        className="rounded-md p-2 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800"
      >
        <Download className="size-4" />
      </button>
      <button
        onClick={() => fileRef.current?.click()}
        title="Import tasks from a JSON file"
        aria-label="Import"
        className="rounded-md p-2 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800"
      >
        <Upload className="size-4" />
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        onChange={onFile}
        className="hidden"
      />
    </div>
  );
}
