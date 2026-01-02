// src/utils/renderMarkdownAdv.js
import { marked } from "marked";
import DOMPurify from "dompurify";

export function renderMarkdownAdv(text) {
  marked.setOptions({
    breaks: true,
    headerIds: false,
    mangle: false,
    langPrefix: "language-",
  });

  const rawHtml = marked.parse(text || "");
  return DOMPurify.sanitize(rawHtml);
}
