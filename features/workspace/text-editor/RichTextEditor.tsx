"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import clsx from "clsx";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import { Markdown, type MarkdownStorage } from "tiptap-markdown";

import type { Editor } from "@tiptap/react";

function getMarkdownStorage(editor: Editor): MarkdownStorage {
  return (editor.storage as unknown as { markdown: MarkdownStorage }).markdown;
}

export interface RichTextEditorHandle {
  focus: () => void;
}

interface RichTextEditorProps {
  editorClassName?: string;
  content: string;
  onUpdate: (content: string) => void;
  placeholder?: string;
  placeholderClassName?: string;
}

function isUrl(text: string) {
  try {
    const url = new URL(text);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export const RichTextEditor = forwardRef<RichTextEditorHandle, RichTextEditorProps>(
  function RichTextEditor(
    {
      content,
      editorClassName,
      onUpdate,
      placeholder = "Add notes...",
      placeholderClassName,
    },
    ref,
  ) {
    const isExternalUpdate = useRef(false);

    // A latest-callback ref lets the editor's onUpdate handler reach the freshest
    // `onUpdate` prop without re-creating the editor instance every render (the
    // stable React 19 replacement for the experimental useEffectEvent).
    const onUpdateRef = useRef(onUpdate);
    onUpdateRef.current = onUpdate;
    const emitUpdate = useCallback((value: string) => {
      onUpdateRef.current(value);
    }, []);

    const editor = useEditor({
      immediatelyRender: false,
      extensions: [
        StarterKit.configure({
          heading: false,
          codeBlock: false,
          blockquote: false,
          horizontalRule: false,
          trailingNode: false,
          link: {
            openOnClick: true,
            autolink: true,
            linkOnPaste: true,
            HTMLAttributes: {
              target: "_blank",
              rel: "noopener noreferrer",
            },
          },
        }),
        Markdown.configure({
          html: false,
          linkify: true,
          breaks: true,
          transformPastedText: true,
          transformCopiedText: true,
        }),
      ],
      content: content ?? "",
      editorProps: {
        attributes: {
          class: clsx(
            "tiptap-editor min-h-[2rem] py-1 text-base font-normal leading-snug",
            editorClassName,
          ),
        },
        handlePaste(view, event) {
          const clipboardText = event.clipboardData?.getData("text/plain");
          if (!clipboardText || !isUrl(clipboardText)) {
            return false;
          }

          const { from, to } = view.state.selection;
          if (from === to) {
            return false;
          }

          event.preventDefault();
          const selectedText = view.state.doc.textBetween(from, to);
          const tr = view.state.tr;
          const linkMark = view.state.schema.marks.link.create({
            href: clipboardText,
          });
          tr.replaceWith(
            from,
            to,
            view.state.schema.text(selectedText, [linkMark]),
          );
          view.dispatch(tr);
          return true;
        },
      },
      onUpdate: ({ editor: e }) => {
        if (isExternalUpdate.current) return;
        emitUpdate(getMarkdownStorage(e).getMarkdown());
      },
    });

    const pendingExternalContentRef = useRef<string | null>(null);
    const updateEditorContent = useCallback(
      (newContent: string) => {
        if (!editor || editor.isDestroyed) return;
        const currentMarkdown = getMarkdownStorage(editor).getMarkdown();

        if (newContent === currentMarkdown) {
          pendingExternalContentRef.current = null;
          return;
        }

        // While focused, defer to avoid clobbering in-progress edits — unless
        // the editor is empty or the new content is a clean append, in which
        // case there's nothing to lose and deferring would leave external
        // appends invisible (e.g. agent "add to notes" while autofocused).
        const isAppendOnly =
          currentMarkdown.length > 0 && newContent.startsWith(currentMarkdown);
        const canApplyWhileFocused = currentMarkdown.length === 0 || isAppendOnly;
        if (editor.isFocused && !canApplyWhileFocused) {
          pendingExternalContentRef.current = newContent;
          return;
        }

        isExternalUpdate.current = true;
        editor.commands.setContent(newContent, { emitUpdate: false });
        if (editor.isFocused) {
          editor.commands.focus("end");
        }
        isExternalUpdate.current = false;
        pendingExternalContentRef.current = null;
      },
      [editor],
    );

    const prevContent = useRef(content);
    useEffect(() => {
      if (content !== prevContent.current) {
        prevContent.current = content;
        updateEditorContent(content);
      }
    }, [content, updateEditorContent]);

    useEffect(() => {
      if (!editor) return;
      const handleBlur = () => {
        if (pendingExternalContentRef.current !== null) {
          updateEditorContent(pendingExternalContentRef.current);
        }
      };
      editor.on("blur", handleBlur);
      return () => {
        editor.off("blur", handleBlur);
      };
    }, [editor, updateEditorContent]);

    useImperativeHandle(
      ref,
      () => ({
        focus: () => {
          editor?.commands.focus("end");
        },
      }),
      [editor],
    );

    // While the editor is mounting (Tiptap uses `immediatelyRender: false` to
    // avoid SSR hydration mismatches), render a static text preview that
    // matches the editor's typography and min-height. This prevents both layout
    // shift and a flash before EditorContent mounts.
    if (!editor) {
      const fallbackText = content ?? "";
      return (
        <div className="relative">
          {!fallbackText && (
            <div
              className={clsx(
                "pointer-events-none absolute left-0 top-1 text-base leading-relaxed text-muted-foreground/45",
                placeholderClassName,
              )}
            >
              {placeholder}
            </div>
          )}
          <div
            className={clsx(
              "tiptap-editor min-h-[2rem] py-1 text-base font-normal leading-snug whitespace-pre-wrap",
              editorClassName,
            )}
          >
            {fallbackText}
          </div>
        </div>
      );
    }

    const doc = editor.state.doc;
    const shouldShowPlaceholder =
      doc.childCount === 1 &&
      doc.firstChild?.type.name === "paragraph" &&
      doc.firstChild.content.size === 0;

    return (
      <div className="relative">
        {shouldShowPlaceholder && (
          <div
            className={clsx(
              "pointer-events-none absolute left-0 top-1 text-base leading-relaxed text-muted-foreground/45",
              placeholderClassName,
            )}
          >
            {placeholder}
          </div>
        )}
        <EditorContent editor={editor} />
      </div>
    );
  },
);
