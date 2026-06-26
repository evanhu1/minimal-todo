"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
  type TouchEvent as ReactTouchEvent,
} from "react";

import { useWorkspaceUiStore } from "@/features/workspace/workspace-state/workspace-ui-store";

interface SwipeGestureState {
  identifier: number;
  lock: "horizontal" | "pending";
  startX: number;
  startY: number;
  startTime: number;
  baseOffset: number;
  rowWidth: number;
}

type SwipeState = "closed" | "open";

const SWIPE_LOCK_THRESHOLD_PX = 12;
const SWIPE_TRAY_WIDTH_PX = 144;
const SWIPE_OPEN_THRESHOLD_PX = 48;
const SWIPE_FLICK_VELOCITY_PX_MS = 0.6;
const SWIPE_RUBBER_BAND_FACTOR = 0.4;
const SWIPE_DONE_COMMIT_FRACTION = 0.5;
const SWIPE_SNAP_MS = 220;
const SWIPE_EASING = "cubic-bezier(0.22, 1, 0.36, 1)";

export const TASK_SWIPE_TRAY_WIDTH_PX = SWIPE_TRAY_WIDTH_PX;
export const TASK_SWIPE_SNAP_MS = SWIPE_SNAP_MS;

function clampSwipeOffset(
  proposed: number,
  state: SwipeState,
  rowWidth: number,
): number {
  if (proposed >= 0) {
    return state === "open" ? 0 : Math.min(proposed, rowWidth);
  }
  if (proposed > -SWIPE_TRAY_WIDTH_PX) return proposed;
  const excess = -SWIPE_TRAY_WIDTH_PX - proposed;
  return -SWIPE_TRAY_WIDTH_PX - excess * SWIPE_RUBBER_BAND_FACTOR;
}

interface UseTaskSwipeGestureArgs {
  taskId: string;
  rowRef: RefObject<HTMLDivElement | null>;
  isDragging: boolean;
  isCompleting: boolean;
  isReminderOpen: boolean;
  onCommitDone: () => void;
}

export interface TaskSwipeGesture {
  touchHandlers: {
    onTouchStart: (event: ReactTouchEvent<HTMLDivElement>) => void;
    onTouchMove: (event: ReactTouchEvent<HTMLDivElement>) => void;
    onTouchEnd: () => void;
    onTouchCancel: () => void;
  };
  swipeOffset: number;
  isSwipeDragging: boolean;
  swipeTransition: string;
  trayInteractive: boolean;
  pastDoneThreshold: boolean;
  doneProgress: number;
  doneIconScale: number;
  closeTray: () => void;
}

export function useTaskSwipeGesture({
  taskId,
  rowRef,
  isDragging,
  isCompleting,
  isReminderOpen,
  onCommitDone,
}: UseTaskSwipeGestureArgs): TaskSwipeGesture {
  const [swipeState, setSwipeState] = useState<SwipeState>("closed");
  const [isSwipeDragging, setIsSwipeDragging] = useState(false);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [rowWidth, setRowWidth] = useState(0);
  const swipeGestureRef = useRef<SwipeGestureState | null>(null);
  const setOpenSwipeTrayTaskId = useWorkspaceUiStore(
    (s) => s.setOpenSwipeTrayTaskId,
  );

  const closeTray = useCallback(() => {
    setSwipeState("closed");
    setSwipeOffset(0);
    setIsSwipeDragging(false);
    setOpenSwipeTrayTaskId(null);
  }, [setOpenSwipeTrayTaskId]);

  const openTray = useCallback(() => {
    setSwipeState("open");
    setSwipeOffset(-SWIPE_TRAY_WIDTH_PX);
    setIsSwipeDragging(false);
    setOpenSwipeTrayTaskId(taskId);
  }, [setOpenSwipeTrayTaskId, taskId]);

  // Inlined rather than calling closeTray() so we don't clobber the new tray's
  // id in the store — only this row's local state needs to reset.
  useEffect(() => {
    return useWorkspaceUiStore.subscribe((state, prev) => {
      if (
        state.openSwipeTrayTaskId !== prev.openSwipeTrayTaskId &&
        prev.openSwipeTrayTaskId === taskId &&
        state.openSwipeTrayTaskId !== taskId
      ) {
        setSwipeState("closed");
        setSwipeOffset(0);
        setIsSwipeDragging(false);
      }
    });
  }, [taskId]);

  // Suspended while the reminder popover is open so taps inside the popover
  // don't dismiss the tray behind it.
  useEffect(() => {
    if (swipeState !== "open" || isReminderOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target || rowRef.current?.contains(target)) return;
      closeTray();
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [closeTray, isReminderOpen, rowRef, swipeState]);

  useEffect(() => {
    if (swipeState !== "open") return;
    const onScroll = () => closeTray();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [closeTray, swipeState]);

  const onTouchStart = useCallback(
    (event: ReactTouchEvent<HTMLDivElement>) => {
      if (
        typeof window === "undefined" ||
        window.innerWidth >= 768 ||
        isDragging ||
        isCompleting ||
        event.touches.length !== 1
      ) {
        return;
      }

      const touch = event.touches[0];
      const measuredWidth =
        rowRef.current?.getBoundingClientRect().width ?? window.innerWidth;
      setRowWidth(measuredWidth);
      swipeGestureRef.current = {
        identifier: touch.identifier,
        lock: "pending",
        startX: touch.clientX,
        startY: touch.clientY,
        startTime: Date.now(),
        baseOffset: swipeOffset,
        rowWidth: measuredWidth,
      };
    },
    [isCompleting, isDragging, rowRef, swipeOffset],
  );

  const cancelGesture = useCallback(() => {
    swipeGestureRef.current = null;
    setIsSwipeDragging(false);
    setSwipeOffset(swipeState === "open" ? -SWIPE_TRAY_WIDTH_PX : 0);
  }, [swipeState]);

  const onTouchMove = useCallback(
    (event: ReactTouchEvent<HTMLDivElement>) => {
      const gesture = swipeGestureRef.current;
      if (!gesture || isCompleting || event.touches.length === 0) {
        return;
      }

      if (isDragging) {
        cancelGesture();
        return;
      }

      const touch =
        Array.from(event.touches).find(
          (currentTouch) => currentTouch.identifier === gesture.identifier,
        ) ?? event.touches[0];

      const deltaX = touch.clientX - gesture.startX;
      const deltaY = touch.clientY - gesture.startY;

      if (gesture.lock === "pending") {
        if (
          Math.abs(deltaX) < SWIPE_LOCK_THRESHOLD_PX &&
          Math.abs(deltaY) < SWIPE_LOCK_THRESHOLD_PX
        ) {
          return;
        }

        if (
          Math.abs(deltaX) >= SWIPE_LOCK_THRESHOLD_PX &&
          Math.abs(deltaX) > Math.abs(deltaY) * 1.2
        ) {
          gesture.lock = "horizontal";
          setIsSwipeDragging(true);
        } else {
          cancelGesture();
          return;
        }
      }

      if (gesture.lock !== "horizontal") {
        return;
      }

      event.preventDefault();
      setSwipeOffset(
        clampSwipeOffset(
          gesture.baseOffset + deltaX,
          swipeState,
          gesture.rowWidth,
        ),
      );
    },
    [cancelGesture, isCompleting, isDragging, swipeState],
  );

  const onTouchEnd = useCallback(() => {
    const gesture = swipeGestureRef.current;
    swipeGestureRef.current = null;
    if (isCompleting || !gesture || gesture.lock !== "horizontal") {
      return;
    }

    const elapsed = Date.now() - gesture.startTime;
    const totalDelta = swipeOffset - gesture.baseOffset;
    const velocity = elapsed > 0 ? totalDelta / elapsed : 0;
    const wasOpen = swipeState === "open";

    if (wasOpen) {
      const pastClose =
        swipeOffset > -(SWIPE_TRAY_WIDTH_PX - SWIPE_OPEN_THRESHOLD_PX);
      if (pastClose || velocity > SWIPE_FLICK_VELOCITY_PX_MS) {
        closeTray();
      } else {
        openTray();
      }
      return;
    }

    const commitDoneThreshold = gesture.rowWidth * SWIPE_DONE_COMMIT_FRACTION;
    if (
      swipeOffset >= commitDoneThreshold ||
      (velocity > SWIPE_FLICK_VELOCITY_PX_MS && swipeOffset > 0)
    ) {
      setIsSwipeDragging(false);
      setSwipeOffset(0);
      onCommitDone();
      return;
    }

    if (
      swipeOffset <= -SWIPE_OPEN_THRESHOLD_PX ||
      (velocity < -SWIPE_FLICK_VELOCITY_PX_MS && swipeOffset < 0)
    ) {
      openTray();
      return;
    }

    setIsSwipeDragging(false);
    setSwipeOffset(0);
  }, [
    closeTray,
    isCompleting,
    onCommitDone,
    openTray,
    swipeOffset,
    swipeState,
  ]);

  const swipeTransition = isSwipeDragging
    ? "none"
    : `transform ${SWIPE_SNAP_MS}ms ${SWIPE_EASING}`;
  const commitDoneThreshold = rowWidth * SWIPE_DONE_COMMIT_FRACTION;
  const doneProgress =
    swipeOffset > 0 && commitDoneThreshold > 0
      ? Math.min(swipeOffset / commitDoneThreshold, 1)
      : 0;
  const pastDoneThreshold =
    swipeOffset > 0 && rowWidth > 0 && swipeOffset >= commitDoneThreshold;
  const doneIconScale = pastDoneThreshold ? 1.08 : Math.max(doneProgress, 0);
  const trayInteractive = swipeOffset < 0;

  return {
    touchHandlers: {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
      onTouchCancel: onTouchEnd,
    },
    swipeOffset,
    isSwipeDragging,
    swipeTransition,
    trayInteractive,
    pastDoneThreshold,
    doneProgress,
    doneIconScale,
    closeTray,
  };
}
