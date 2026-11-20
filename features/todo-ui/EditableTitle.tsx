"use client";

import {
  useCallback,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from "react";

import styles from "./EditableTitle.module.css";
import { useCoarsePointer } from "./gestures";
import { useTitleEnter, type TitleElement } from "./useTitleEnter";

export type FocusTitle = (position: {
  offset?: number;
  desiredOffset?: number;
  position?: "start" | "end";
}) => void;

export interface EditableTitleProps {
  className?: string;
  elementRef?: RefObject<TitleElement | null>;
  /** Defaults to true for standalone fields. The workspace opts in through its own prop. */
  enhancedInteractions?: boolean;
  registerFocus?: (focus: FocusTitle) => () => void;
  onSubmit?: (text: string, caret: number) => void;
  onOpenNotes?: (text: string) => void;
  multiline?: boolean;
  onFocusChange?: (focused: boolean) => void;
  onKeyDown?: (event: React.KeyboardEvent<TitleElement>) => void;
  onMoveFocus?: (direction: "up" | "down", focusOffset: number) => void;
  onUpdateText: (text: string) => void;
  placeholder: string;
  suppressTouchTextSelection?: boolean;
  text: string;
}

export function EditableTitle({
  className,
  elementRef,
  enhancedInteractions = true,
  registerFocus,
  onSubmit,
  onOpenNotes,
  multiline = false,
  onFocusChange,
  onKeyDown,
  onMoveFocus,
  onUpdateText,
  placeholder,
  suppressTouchTextSelection = false,
  text,
}: EditableTitleProps) {
  const desiredOffsetRef = useRef<number | null>(null);
  const innerRef = useRef<TitleElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const isCoarsePointer = useCoarsePointer();
  const enter = useTitleEnter(innerRef, enhancedInteractions, multiline, onSubmit, onOpenNotes);
  // A separate hit target lets an unfocused title start a touch drag on iOS.
  // Once editing starts, touches land directly on the native field.
  const needsTapShield = suppressTouchTextSelection && isCoarsePointer && !isFocused;

  useImperativeHandle(elementRef, () => innerRef.current!);

  const resizeTextarea = useCallback(() => {
    const el = innerRef.current;
    if (!(el instanceof HTMLTextAreaElement)) {
      return;
    }

    el.style.height = "0px";
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  useLayoutEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    if (el.value === text) return;
    if (typeof document !== "undefined" && document.activeElement === el) return;
    el.value = text;
    resizeTextarea();
  }, [resizeTextarea, text]);

  useLayoutEffect(() => {
    resizeTextarea();
  }, [resizeTextarea, text]);

  useLayoutEffect(() => {
    return registerFocus?.((nextFocusTarget) => {
      const el = innerRef.current;
      if (!el) {
        return;
      }

      // The text-sync effect above bails when this element is focused, so
      // an intentional programmatic focus needs to sync the latest text
      // before applying the new caret position.
      if (el.value !== text) {
        el.value = text;
      }

      resizeTextarea();

      el.focus();

      const length = el.value.length;
      let offset: number;
      if (typeof nextFocusTarget.offset === "number") {
        offset = Math.max(0, Math.min(nextFocusTarget.offset, length));
      } else if (nextFocusTarget.position === "start") {
        offset = 0;
      } else {
        offset = length;
      }

      el.setSelectionRange(offset, offset);
      desiredOffsetRef.current = nextFocusTarget.desiredOffset ?? offset;
    });
  }, [registerFocus, resizeTextarea, text]);

  function handleChange(event: React.ChangeEvent<TitleElement>) {
    desiredOffsetRef.current = null;
    if (!enter.consumeLineBreak(event.currentTarget)) onUpdateText(event.currentTarget.value);
    resizeTextarea();
  }

  function handleBlur() {
    enter.clear();
    desiredOffsetRef.current = null;
    const el = innerRef.current;
    if (el && el.value !== text) {
      el.value = text;
    }
    resizeTextarea();
    setIsFocused(false);
    onFocusChange?.(false);
  }

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    onFocusChange?.(true);
  }, [onFocusChange]);

  const handleMouseUp = useCallback(() => {
    desiredOffsetRef.current = null;
  }, []);

  function handleKeyDown(event: React.KeyboardEvent<TitleElement>) {
    if (enhancedInteractions && (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229)) return;
    onKeyDown?.(event);
    if (event.defaultPrevented || enter.keyDown(event)) return;

    if (onMoveFocus && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
      const focusOffset = desiredOffsetRef.current ?? event.currentTarget.selectionStart ?? 0;
      desiredOffsetRef.current = focusOffset;
      event.preventDefault();
      onMoveFocus(event.key === "ArrowUp" ? "up" : "down", focusOffset);
      return;
    }
    desiredOffsetRef.current = null;
  }

  const suppressCallout = suppressTouchTextSelection && !enhancedInteractions;
  const field = {
    defaultValue: text,
    spellCheck: false,
    placeholder,
    onChange: handleChange,
    onFocus: handleFocus,
    onBlur: handleBlur,
    onMouseUp: handleMouseUp,
    onKeyDown: handleKeyDown,
    onContextMenu: suppressCallout ? (event: React.MouseEvent) => event.preventDefault() : undefined,
    className: [
      className,
      suppressCallout && styles.suppressCallout,
      needsTapShield && styles.deferEdit,
    ].filter(Boolean).join(" "),
  };

  return (
    <>
      {multiline ? (
        <textarea {...field} ref={innerRef as RefObject<HTMLTextAreaElement | null>} rows={1} />
      ) : (
        <input {...field} ref={innerRef as RefObject<HTMLInputElement | null>} type="text" />
      )}
      {needsTapShield && (
        <div
          aria-hidden="true"
          className={enhancedInteractions ? `${styles.shield} ${styles.dragSurface}` : styles.shield}
          onClick={() => innerRef.current?.focus()}
          onContextMenu={enhancedInteractions ? (event) => event.preventDefault() : undefined}
        />
      )}
    </>
  );
}
