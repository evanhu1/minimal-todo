"use client";

import {
  useCallback,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type RefObject,
} from "react";

import { useFocusManager } from "./focus-manager/FocusManagerContext";
import type { TodoFocusTarget } from "./focus-manager/focus";

interface EditableTitleProps {
  className: string;
  elementRef: RefObject<EditableTitleElement | null>;
  focusId: string;
  focusTarget: TodoFocusTarget["target"];
  multiline?: boolean;
  onFocusChange?: (focused: boolean) => void;
  onKeyDown?: (event: React.KeyboardEvent<EditableTitleElement>) => void;
  onMoveFocus: (direction: "up" | "down", focusOffset: number) => void;
  onUpdateText: (text: string) => void;
  placeholder: string;
  suppressTouchTextSelection?: boolean;
  text: string;
}

type EditableTitleElement = HTMLInputElement | HTMLTextAreaElement;

/**
 * Shared editable title field used by TaskList and TaskBlock.
 */
export function EditableTitle({
  className,
  elementRef,
  focusId,
  focusTarget,
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
  const innerRef = useRef<EditableTitleElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const isCoarsePointer = useSyncExternalStore<boolean>(
    subscribeCoarsePointer,
    getCoarsePointerSnapshot,
    () => false,
  );
  const { registerFocusable } = useFocusManager();
  // A non-editable shield covers the editable element on touch devices when
  // unfocused. iOS Safari hit-tests touches against the shield (a div) rather
  // than the textarea, so its long-press text-selection magnifier — which
  // fires on any touch landing on an editable element, even one with
  // pointer-events: none — never triggers. On tap, the shield programmatically
  // focuses the underlying element, at which point it stops rendering.
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
    return registerFocusable(
      { id: focusId, target: focusTarget },
      {
        focus: (nextFocusTarget) => {
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
        },
      },
    );
  }, [focusId, focusTarget, registerFocusable, resizeTextarea, text]);

  const handleChange = useCallback(
    (event: React.ChangeEvent<EditableTitleElement>) => {
      desiredOffsetRef.current = null;
      onUpdateText(event.target.value);
      resizeTextarea();
    },
    [onUpdateText, resizeTextarea],
  );

  const handleBlur = useCallback(() => {
    desiredOffsetRef.current = null;
    const el = innerRef.current;
    if (el && el.value !== text) {
      el.value = text;
    }
    resizeTextarea();
    setIsFocused(false);
    onFocusChange?.(false);
  }, [onFocusChange, resizeTextarea, text]);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    onFocusChange?.(true);
  }, [onFocusChange]);

  const handleMouseUp = useCallback(() => {
    desiredOffsetRef.current = null;
  }, []);

  const handleContextMenu = useCallback(
    (event: React.MouseEvent<EditableTitleElement>) => {
      if (!suppressTouchTextSelection) {
        return;
      }

      event.preventDefault();
    },
    [suppressTouchTextSelection],
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<EditableTitleElement>) => {
      onKeyDown?.(event);
      if (event.defaultPrevented) {
        return;
      }

      if (event.key === "ArrowUp" || event.key === "ArrowDown") {
        const el = innerRef.current;
        if (!el) return;
        const currentOffset = el.selectionStart ?? 0;
        const focusOffset = desiredOffsetRef.current ?? currentOffset;
        desiredOffsetRef.current = focusOffset;
        event.preventDefault();
        onMoveFocus(event.key === "ArrowUp" ? "up" : "down", focusOffset);
        return;
      }

      desiredOffsetRef.current = null;
    },
    [onKeyDown, onMoveFocus],
  );

  const titleClassName = suppressTouchTextSelection
    ? `${className} touch-no-text-callout${needsTapShield ? " touch-defer-edit" : ""}`
    : className;

  const focusForEdit = () => {
    innerRef.current?.focus();
  };

  const shield = needsTapShield ? (
    <div
      aria-hidden="true"
      className="absolute inset-0 z-[1] cursor-text"
      onClick={focusForEdit}
    />
  ) : null;

  if (multiline) {
    return (
      <>
        <textarea
          ref={innerRef as RefObject<HTMLTextAreaElement | null>}
          rows={1}
          defaultValue={text}
          spellCheck={false}
          placeholder={placeholder}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onMouseUp={handleMouseUp}
          onContextMenu={handleContextMenu}
          onKeyDown={handleKeyDown}
          className={titleClassName}
        />
        {shield}
      </>
    );
  }

  return (
    <>
      <input
        ref={innerRef as RefObject<HTMLInputElement | null>}
        type="text"
        defaultValue={text}
        spellCheck={false}
        placeholder={placeholder}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onMouseUp={handleMouseUp}
        onContextMenu={handleContextMenu}
        onKeyDown={handleKeyDown}
        className={titleClassName}
      />
      {shield}
    </>
  );
}

const COARSE_POINTER_QUERY = "(pointer: coarse)";

function subscribeCoarsePointer(onChange: () => void): () => void {
  if (typeof window === "undefined" || !window.matchMedia) {
    return () => { };
  }
  const mql = window.matchMedia(COARSE_POINTER_QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

function getCoarsePointerSnapshot(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia(COARSE_POINTER_QUERY).matches;
}
