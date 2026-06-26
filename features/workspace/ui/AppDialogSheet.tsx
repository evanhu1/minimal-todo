"use client";

import clsx from "clsx";
import {
  AnimatePresence,
  motion,
  useDragControls,
  type PanInfo,
} from "motion/react";
import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

import { useIsMobile } from "@/features/workspace/hooks/useIsMobile";
import { acquireScrollLock } from "@/features/workspace/ui/scroll-lock";

interface AppDialogSheetProps {
  open: boolean;
  onClose?: () => void;
  titleId: string;
  children: ReactNode;
  maxWidthClassName?: string;
  bare?: boolean;
}

const emptySubscribe = () => () => {};
const DISMISS_DISTANCE = 120;
const DISMISS_VELOCITY = 500;
const MOBILE_SHEET_MAX_HEIGHT_CLASS = "max-h-[92dvh]";
const MOBILE_DRAG_HANDLE_CLASS =
  "flex h-8 flex-none cursor-grab touch-none items-start justify-center pt-3 active:cursor-grabbing md:hidden";

export function AppDialogSheet({
  open,
  onClose,
  titleId,
  children,
  maxWidthClassName = "md:w-[32rem]",
  bare = false,
}: AppDialogSheetProps) {
  const isMounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
  const dragControls = useDragControls();
  const isMobile = useIsMobile();

  const handleClose = useCallback(() => {
    onClose?.();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;

    const release = acquireScrollLock({ freezeScroll: true });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && onClose) {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      release();
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleClose, onClose, open]);

  const draggable = isMobile && Boolean(onClose);

  const handleDragEnd = (
    _: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo,
  ) => {
    if (!onClose) return;
    if (info.offset.y > DISMISS_DISTANCE || info.velocity.y > DISMISS_VELOCITY) {
      handleClose();
    }
  };

  const startDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!draggable) return;
    dragControls.start(event);
  };

  if (!isMounted) return null;

  const dragHandle = draggable ? (
    <div onPointerDown={startDrag} className={MOBILE_DRAG_HANDLE_CLASS}>
      <div className="h-1.5 w-12 rounded-full bg-border" />
    </div>
  ) : null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <div
          className="fixed inset-0 z-50 overflow-hidden overscroll-none"
        >
          <motion.button
            type="button"
            aria-label="Close"
            className="pointer-events-auto absolute inset-0 bg-foreground/40 backdrop-blur-md dark:bg-black/60"
            onClick={handleClose}
            disabled={!onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex max-h-[100dvh] items-end justify-center md:inset-0 md:items-center md:p-6">
            <motion.section
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              className={`pointer-events-auto relative z-10 flex ${MOBILE_SHEET_MAX_HEIGHT_CLASS} w-full flex-col overflow-hidden overscroll-contain rounded-t-[28px] bg-background text-foreground shadow-[0_-12px_40px_-12px_rgba(0,0,0,0.25)] md:h-auto md:max-h-[calc(100vh-4rem)] ${maxWidthClassName} md:rounded-2xl md:border md:border-border md:shadow-2xl`}
              initial={{ opacity: 0, y: isMobile ? "100%" : 28 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: isMobile ? "100%" : 28 }}
              transition={{
                type: "spring",
                stiffness: 420,
                damping: 34,
                mass: 0.9,
              }}
              drag={draggable ? "y" : false}
              dragControls={dragControls}
              dragListener={false}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.6 }}
              onDragEnd={handleDragEnd}
            >
              {bare ? (
                <>
                  {dragHandle}
                  {children}
                </>
              ) : (
                <>
                  {dragHandle}
                  <div
                    className={clsx(
                      "flex flex-1 flex-col overflow-y-auto overscroll-contain px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] md:pt-6 md:pb-6",
                      // The drag handle already provides top chrome; without
                      // it the content needs its own breathing room.
                      draggable ? "pt-1" : "pt-[max(1rem,env(safe-area-inset-top))]",
                    )}
                  >
                    {children}
                  </div>
                </>
              )}
            </motion.section>
          </div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
