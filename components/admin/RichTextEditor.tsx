"use client";

// Admin rich-text editor for lesson descriptions (TipTap v3).
// Toolbar: bold, italic, underline, link/unlink, bullet + numbered list.
// Enter = new paragraph, Shift+Enter = line break. Emits HTML on every change.
// Loaded via next/dynamic (ssr: false) from LessonEditor to avoid SSR/hydration
// mismatches with ProseMirror.

import { useEffect } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

type Props = {
  value: string; // HTML
  onChange: (html: string) => void;
  placeholder?: string;
};

const editorCls =
  "w-full bg-white border border-line rounded-input px-3 py-2 text-sm text-textPrimary outline-none " +
  "focus-within:border-primary focus-within:ring-[1.5px] focus-within:ring-primary min-h-[120px] " +
  "[&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[100px] " +
  "[&_.ProseMirror_p]:my-1 [&_.ProseMirror_a]:text-primary [&_.ProseMirror_a]:underline " +
  "[&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-5 [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pl-5";

function ToolBtn({
  active,
  onClick,
  title,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => e.preventDefault()} // keep editor selection
      onClick={onClick}
      className={
        "h-7 min-w-7 px-2 rounded-md text-sm font-semibold inline-flex items-center justify-center transition-colors " +
        (active ? "bg-primary text-white" : "bg-subtle text-textPrimary hover:bg-promo")
      }
    >
      {children}
    </button>
  );
}

function setLink(editor: Editor) {
  const previous = editor.getAttributes("link").href as string | undefined;
  const url = window.prompt("Link URL (https://…)", previous ?? "https://");
  if (url === null) return; // cancelled
  const trimmed = url.trim();
  if (!trimmed || trimmed === "https://") {
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    return;
  }
  const href = /^https?:\/\//i.test(trimmed) ? trimmed : "https://" + trimmed;
  editor.chain().focus().extendMarkRange("link").setLink({ href, target: "_blank", rel: "noopener noreferrer" }).run();
}

export default function RichTextEditor({ value, onChange, placeholder }: Props) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        codeBlock: false,
        code: false,
        horizontalRule: false,
        strike: false,
        link: {
          openOnClick: false,
          autolink: true,
          defaultProtocol: "https",
          HTMLAttributes: { target: "_blank", rel: "noopener noreferrer" },
        },
      }),
    ],
    content: value || "",
    editorProps: {
      attributes: {
        class: "focus:outline-none",
        "data-placeholder": placeholder ?? "",
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  // Keep the editor in sync if the parent swaps the lesson being edited.
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if ((value || "") !== current && !editor.isFocused) {
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
  }, [editor, value]);

  if (!editor) {
    return <div className={editorCls + " text-textSecondary"}>Loading editor…</div>;
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1 mb-1.5">
        <ToolBtn title="Bold (Ctrl/Cmd+B)" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
          <span className="font-bold">B</span>
        </ToolBtn>
        <ToolBtn title="Italic (Ctrl/Cmd+I)" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <span className="italic">I</span>
        </ToolBtn>
        <ToolBtn title="Underline (Ctrl/Cmd+U)" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}>
          <span className="underline">U</span>
        </ToolBtn>
        <span className="w-px h-5 bg-line mx-1" />
        <ToolBtn title="Add / edit link" active={editor.isActive("link")} onClick={() => setLink(editor)}>
          Link
        </ToolBtn>
        <ToolBtn title="Remove link" onClick={() => editor.chain().focus().extendMarkRange("link").unsetLink().run()}>
          Unlink
        </ToolBtn>
        <span className="w-px h-5 bg-line mx-1" />
        <ToolBtn title="Bullet list" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          • List
        </ToolBtn>
        <ToolBtn title="Numbered list" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          1. List
        </ToolBtn>
      </div>
      <div className={editorCls} onClick={() => editor.chain().focus().run()}>
        <EditorContent editor={editor} />
      </div>
      <p className="text-[12px] text-textSecondary mt-1">Enter = new paragraph · Shift+Enter = line break · select text then Link to add a hyperlink.</p>
    </div>
  );
}
