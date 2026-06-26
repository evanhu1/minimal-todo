"use client";

import { useEffect } from "react";

import { useWorkspaceUiStore } from "@/features/workspace/workspace-state/workspace-ui-store";

const NOTIFICATION_MS = 4000;

export function WorkspaceNotification() {
  const notification = useWorkspaceUiStore((s) => s.notification);
  const dismissNotification = useWorkspaceUiStore((s) => s.dismissNotification);

  useEffect(() => {
    if (!notification) return;
    const timeout = window.setTimeout(
      () => dismissNotification(notification.id),
      NOTIFICATION_MS,
    );
    return () => window.clearTimeout(timeout);
  }, [dismissNotification, notification]);

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4 pb-[env(safe-area-inset-bottom)]"
      aria-live="polite"
      aria-atomic="true"
    >
      {notification ? (
        <div
          key={notification.id}
          className="rounded-md border border-border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-lg"
        >
          {notification.message}
        </div>
      ) : null}
    </div>
  );
}
