import DOMPurify from "dompurify";

// Rich-text helpers for lessons.description (post-launch update).
//
// lessons.description now stores sanitized HTML written by the admin
// RichTextEditor (TipTap). Older rows still hold plain text with "\n" line
// breaks — both shapes are supported everywhere via toHtml(), so nothing
// existing needs re-saving.

// Tags/attributes the portal will ever render from a description.
export const ALLOWED_TAGS = ["p", "br", "strong", "b", "em", "i", "u", "a", "ul", "ol", "li"];
export const ALLOWED_ATTR = ["href", "target", "rel"];

// A stored value is treated as HTML only when it contains a block tag the
// editor always emits (<p>, <ul>, <ol>) or an explicit <br>. Anything else is
// legacy plain text, even if it happens to contain a stray "<b>".
export function isHtml(value: string): boolean {
  return /<\s*(p|ul|ol|br)[\s>\/]/i.test(value);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Legacy plain text → HTML. Blank lines become paragraph breaks, single
// newlines become <br>, so the admin's original line breaks are preserved.
export function plainTextToHtml(text: string): string {
  const paragraphs = text.replace(/\r\n?/g, "\n").trim().split(/\n{2,}/);
  return paragraphs
    .map((p) => "<p>" + escapeHtml(p).replace(/\n/g, "<br>") + "</p>")
    .join("");
}

// Normalise any stored description (HTML or legacy text) to HTML.
export function toHtml(value: string | null | undefined): string {
  if (!value || !value.trim()) return "";
  return isHtml(value) ? value : plainTextToHtml(value);
}

// True when the editor's HTML has no real content (TipTap emits "<p></p>" for
// an empty document). Used so an emptied description saves as NULL again.
export function isEmptyHtml(html: string): boolean {
  return !html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
}

// Browser-only sanitiser (DOMPurify needs a DOM). Both call sites are client
// components; on the server this returns "" and the client fills it in.
export function sanitizeHtml(html: string): string {
  if (typeof window === "undefined") return "";
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ADD_ATTR: ["target"],
  });
}
