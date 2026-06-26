"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

export function AddTask({ onAdd }: { onAdd: (title: string) => void }) {
  const [value, setValue] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const title = value.trim();
    if (!title) return;
    onAdd(title);
    setValue("");
  }

  return (
    <form onSubmit={submit} className="flex items-center gap-2">
      <Plus className="size-5 shrink-0 text-neutral-400" aria-hidden />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Add a task and press Enter"
        aria-label="Add a task"
        className="w-full border-b border-neutral-200 bg-transparent py-2 text-base outline-none placeholder:text-neutral-400 focus:border-neutral-400 dark:border-neutral-800 dark:focus:border-neutral-600"
        autoFocus
      />
    </form>
  );
}
