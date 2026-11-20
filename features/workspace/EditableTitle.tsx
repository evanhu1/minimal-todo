"use client";

import { createContext, useCallback, useContext } from "react";
import {
  EditableTitle as TitleField,
  type EditableTitleProps,
  type FocusTitle,
} from "@/features/todo-ui/EditableTitle";
import { useFocusManager } from "./focus-manager/FocusManagerContext";
import type { TodoFocusTarget } from "./focus-manager/focus";

export const EnhancedInteractionsContext = createContext(false);

type WorkspaceTitleProps = Omit<EditableTitleProps, "registerFocus" | "enhancedInteractions"> & {
  focusId: string;
  focusTarget: TodoFocusTarget["target"];
};

export function EditableTitle({ focusId, focusTarget, ...props }: WorkspaceTitleProps) {
  const enhanced = useContext(EnhancedInteractionsContext);
  const { registerFocusable } = useFocusManager();
  const registerFocus = useCallback(
    (focus: FocusTitle) => registerFocusable({ id: focusId, target: focusTarget }, { focus }),
    [focusId, focusTarget, registerFocusable],
  );

  return <TitleField {...props} registerFocus={registerFocus} enhancedInteractions={enhanced} />;
}
