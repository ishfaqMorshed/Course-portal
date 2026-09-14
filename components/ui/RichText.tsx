"use client";

// Renders a lesson description exactly as authored in the admin editor
// (paragraphs, line breaks, bold/italic/underline, links, lists). Accepts
// either the new HTML format or legacy plain text (converted on the fly).
// HTML is sanitised with DOMPurify before it touches the DOM.

import { useEffect, useState } from "react";
import { sanitizeHtml, toHtml } from "@/lib/richtext";

export default function RichText({ value, className = "" }: { value: string | null | undefined; className?: string }) {
  // Sanitise on the client after mount (DOMPurify needs a DOM; also avoids
  // any server/client markup mismatch).
  const [html, setHtml] = useState("");
  useEffect(() => setHtml(sanitizeHtml(toHtml(value))), [value]);
  if (!html) return null;
  return (
    <div
      className={
        "text-sm text-textSecondary leading-[22px] " +
        "[&_p]:my-0 [&_p+p]:mt-3 " +
        "[&_strong]:font-semibold [&_strong]:text-textPrimary [&_b]:font-semibold [&_b]:text-textPrimary " +
        "[&_em]:italic [&_u]:underline " +
        "[&_a]:text-primary [&_a]:underline [&_a]:break-words hover:[&_a]:text-primaryHover " +
        "[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-2 [&_li]:my-0.5 " +
        className
      }
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
