"use client";

import { useLayoutEffect, useRef, type KeyboardEvent, type RefObject } from "react";
import { hasCoarsePointer } from "./gestures";

export type TitleElement = HTMLInputElement | HTMLTextAreaElement;
type Submit = (text: string, caret: number) => void;

export function useTitleEnter(
  ref: RefObject<TitleElement | null>,
  enhanced: boolean,
  multiline: boolean,
  onSubmit?: Submit,
  onOpenNotes?: (text: string) => void,
) {
  // Some soft keyboards insert a newline without a cancelable beforeinput.
  // Remember the original selection so the ensuing input can submit once.
  const pending = useRef<{ text: string; start: number; end: number } | null>(null);

  useLayoutEffect(() => {
    const field = ref.current;
    if (!enhanced || !multiline || !onSubmit || !(field instanceof HTMLTextAreaElement)) return;
    const submit = onSubmit;

    function beforeInput(event: InputEvent) {
      pending.current = null;
      if (event.defaultPrevented || event.isComposing ||
          (event.inputType !== "insertParagraph" && event.inputType !== "insertLineBreak")) return;
      const el = event.currentTarget as HTMLTextAreaElement;
      if (event.cancelable) {
        event.preventDefault();
        submit(el.value, el.selectionStart);
      } else {
        pending.current = { text: el.value, start: el.selectionStart, end: el.selectionEnd };
      }
    }

    field.addEventListener("beforeinput", beforeInput);
    return () => field.removeEventListener("beforeinput", beforeInput);
  }, [ref, enhanced, multiline, onSubmit]);

  function keyDown(event: KeyboardEvent<TitleElement>) {
    pending.current = null;
    const el = event.currentTarget;
    const enter = event.key === "Enter";
    if (onOpenNotes && ((event.key === "Tab" && !event.shiftKey) ||
        (enhanced && enter && event.shiftKey && !hasCoarsePointer()))) {
      event.preventDefault();
      onOpenNotes(el.value);
      return true;
    }
    if (!enter || !onSubmit) return false;
    const start = el.selectionStart ?? 0;
    if (enhanced && el instanceof HTMLTextAreaElement && hasCoarsePointer() &&
        start === 0 && el.selectionEnd === 0 && el.value.length > 0) {
      // Let the soft keyboard see Return so it can re-arm capitalization.
      pending.current = { text: el.value, start: 0, end: 0 };
    } else {
      event.preventDefault();
      onSubmit(el.value, start);
    }
    return true;
  }

  function consumeLineBreak(el: TitleElement) {
    const edit = pending.current;
    pending.current = null;
    if (!onSubmit || !edit || el.value !== edit.text.slice(0, edit.start) + "\n" + edit.text.slice(edit.end)) {
      return false;
    }
    el.value = edit.text;
    el.setSelectionRange(edit.start, edit.end);
    onSubmit(edit.text, edit.start);
    return true;
  }

  return { keyDown, consumeLineBreak, clear: () => { pending.current = null; } };
}
