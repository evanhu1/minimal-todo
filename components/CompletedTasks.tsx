"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import { ChevronRight, RotateCcw } from "lucide-react";

import type { Task } from "@/lib/types";
import { completedDayLabel } from "@/lib/util";
import type { TaskHandlers } from "@/components/TodoApp";

export function CompletedTasks({
  tasks,
  handlers,
}: {
  tasks: Record<string, Task>;
  handlers: TaskHandlers;
}) {
  const [open, setOpen] = useState(false);

  const groups = useMemo(() => {
    const done = Object.values(tasks)
      .filter((t) => t.status === "done" && t.completedAt)
      .sort((a, b) => (b.completedAt! < a.completedAt! ? -1 : 1));

    const byDay = new Map<string, Task[]>();
    for (const t of done) {
      const label = completedDayLabel(t.completedAt!);
      const bucket = byDay.get(label);
      if (bucket) bucket.push(t);
      else byDay.set(label, [t]);
    }
    return { total: done.length, byDay: Array.from(byDay.entries()) };
  }, [tasks]);

  if (groups.total === 0) return null;

  return (
    <section className="mt-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-sm text-neutral-400 hover:text-neutral-600"
      >
        <ChevronRight className={clsx("size-4 transition-transform", open && "rotate-90")} />
        Completed ({groups.total})
      </button>

      {open && (
        <div className="mt-3 flex flex-col gap-4">
          {groups.byDay.map(([label, dayTasks]) => (
            <div key={label}>
              <h2 className="mb-1 text-xs font-medium uppercase tracking-wide text-neutral-400">
                {label}
              </h2>
              <ul className="flex flex-col">
                {dayTasks.map((t) => (
                  <li key={t.id} className="group flex items-center gap-2 py-1">
                    <button
                      onClick={() => handlers.restore(t.id)}
                      aria-label="Restore task"
                      className="text-neutral-300 hover:text-neutral-600"
                    >
                      <RotateCcw className="size-3.5" />
                    </button>
                    <span className="text-sm text-neutral-400 line-through">{t.title}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
