import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";

import MessageActions from "./MessageActions";
import { FileText } from "lucide-react";
import { useEffect, useMemo } from "react";
import CodeRenderer from "../renderer/CodeRenderer";
import CodeBlock from "../renderer/CodeBlock";

// === Bubble layout settings ===
// Use any Tailwind percentage / ch / rem etc.
const USER_BUBBLE_MAX = "max-w-[80%] lg:max-w-[65%]";
const ASSIST_BUBBLE_MAX = "max-w-[82%] lg:max-w-[70%]";
/* =========================
 * Format-specific Renderers
 * ========================= */
const JsonRenderer = ({ content }) => {
  try {
    const jsonData =
      typeof content === "object" ? content : JSON.parse(content);
    return (
      <div className="bg-gray-50 p-3 rounded">
        <div className="text-xs text-gray-600 mb-2">JSON Response</div>
        <pre className="text-sm overflow-x-auto">
          <code>{JSON.stringify(jsonData, null, 2)}</code>
        </pre>
      </div>
    );
  } catch {
    return <TextRenderer content={content} />;
  }
};

function fixBrokenLinks(md) {
  return md
    .replace(/\]\s+\((https?:\/\/[^\s)]+)\)/g, "]($1)")
    .replace(/\)\(page\s+(\d+)/gi, ") (page $1)");
}

const MarkdownRenderer = ({ content }) => (
  <div className="prose max-w-none">
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      // IMPORTANT: allow spans + classes so hljs can color text
      rehypePlugins={[
        [
          rehypeSanitize,
          {
            tagNames: [
              "p",
              "strong",
              "em",
              "ul",
              "ol",
              "li",
              "code",
              "pre",
              "a",
              "h1",
              "h2",
              "h3",
              "blockquote",
              "br",
              "span",
              "div",
            ],
            attributes: {
              a: ["href", "target", "rel"],
              code: ["className"],
              span: ["className"],
              div: ["className"],
            },
          },
        ],
      ]}
      components={{
        code({ inline, className, children, ...props }) {
          const m = /language-(\w+)/.exec(className || "");
          const lang = m?.[1];
          const raw = String(children ?? "");
          const hasNewline = raw.includes("\n");
          const tiny = raw.trim().length <= 40;

          // Treat short, single-line snippets as inline code even if parsed oddly
          if (inline || (!hasNewline && tiny && !lang)) {
            return (
              <code
                className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-800 border border-gray-200"
                {...props}
              >
                {children}
              </code>
            );
          }
          return <CodeBlock code={raw} language={lang} />;
        },
        strong({ children, ...p }) {
          return <strong className="font-bold">{children}</strong>;
        },
        b({ children, ...p }) {
          return <b className="font-bold">{children}</b>;
        },
        em({ children, ...p }) {
          return <em className="italic">{children}</em>;
        },
      }}
    >
      {content}
    </ReactMarkdown>
  </div>
);

const TextRenderer = ({ content }) => (
  <div className="whitespace-pre-wrap text-gray-800">{content}</div>
);

const HtmlRenderer = ({ content }) => (
  <div className="bg-gray-50 p-3 rounded">
    <details>
      <summary className="cursor-pointer text-sm text-gray-600 mb-2">
        HTML Content
      </summary>
      <pre className="text-xs overflow-x-auto">
        <code>{content}</code>
      </pre>
    </details>
  </div>
);

// const CodeRenderer = ({ content, language }) => (
//   <div className="bg-gray-900 text-green-400 p-3 rounded">
//     <div className="text-xs text-gray-400 mb-2">{language || "Code"}</div>
//     <pre className="text-sm overflow-x-auto">
//       <code>{content}</code>
//     </pre>
//   </div>
// );

/* =========================
 * Attachment helpers
 * ========================= */
const isProbablyImage = (att) => {
  const t = (att?.mime_type || att?.type || att?.mimeType || "").toLowerCase();
  if (t === "image" || t === "image/*" || t.startsWith("image/")) return true;

  const srcGuess =
    att?.display_url || att?.displayUrl || att?.url || att?.path || "";
  const name = (att?.name || att?.filename || srcGuess).toLowerCase();
  return /\.(png|jpe?g|gif|webp|bmp|tiff|svg)$/i.test(name);
};

// Prefer object/blob preview, then server URL
const attachmentSrc = (att) =>
  att?.meta?.display_url ||
  // att?.display_url ||
  // att?.displayUrl ||
  // att?.url ||
  null;

/* =========================
 * Content Auto-Detection
 * ========================= */
const renderContent = (msg) => {
  const content = typeof msg.content === "string" ? msg.content.trim() : "";
  if (!content) return <TextRenderer content="" />;

  // JSON
  try {
    if (
      msg.format === "json" ||
      (content.startsWith("{") && content.endsWith("}")) ||
      (content.startsWith("[") && content.endsWith("]"))
    ) {
      return <JsonRenderer content={content} />;
    }
  } catch {}

  // HTML
  if (
    msg.format === "html" ||
    (content.includes("<") && content.includes(">") && content.includes("/"))
  ) {
    return <HtmlRenderer content={content} />;
  }

  // Code
  if (msg.format === "code" || msg.language) {
    return <CodeRenderer content={content} language={msg.language} />;
  }

  const isProbablyMarkdown = (text) => {
    return (
      text.includes("```") ||
      text.includes("**") ||
      text.includes("# ") ||
      text.match(/\[.+\]\((http.*)\)/) ||
      text.match(/^\d+\.\s+/m) ||
      text.match(/^[-*+]\s+/m)
    );
  };

  // Markdown
  if (msg.format === "markdown" || isProbablyMarkdown(content)) {
    return <MarkdownRenderer content={content} />;
  }

  // Default plain text
  return <TextRenderer content={content} />;
};

/* =========================
 * Chat Message Component
 * ========================= */
export default function ChatMessage({ msg, onCopy, onEdit, onDownload }) {
  const isUser = msg.role === "user";

  // Coerce attachments (in case server sent a string)
  const attachments = useMemo(() => {
    if (Array.isArray(msg.attachments)) return msg.attachments;
    if (typeof msg.attachments === "string") {
      try {
        const parsed = JSON.parse(msg.attachments);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  }, [msg.attachments]);

  const imageAtts = useMemo(
    () => attachments.filter((a) => isProbablyImage(a)),
    [attachments]
  );
  const fileAtts = useMemo(
    () => attachments.filter((a) => !isProbablyImage(a)),
    [attachments]
  );

  // DEBUG: log on render when attachments exist
  useEffect(() => {
    if (attachments.length) {
      console.log("🧩 ChatMessage render -> attachments", {
        attachments,
        resolvedSrcs: attachments.map((a) => attachmentSrc(a)),
        imageFlags: attachments.map((a) => isProbablyImage(a)),
      });
    }
  }, [attachments]);

  useEffect(() => {
    if (imageAtts.length > 0) {
      console.log("🖼️ Image attachments debug:", {
        totalImages: imageAtts.length,
        images: imageAtts.map((att, i) => ({
          index: i,
          name: att.name,
          type: att.type || att.mime_type,
          src: attachmentSrc(att),
          hasDisplayUrl: !!att.display_url,
          hasUrl: !!att.url,
        })),
      });
    }
  }, [imageAtts]);

  if (typeof msg.citations === "string") {
    try {
      msg.citations = JSON.parse(msg.citations);
    } catch {}
  }
  if (typeof msg.chunks === "string") {
    try {
      msg.chunks = JSON.parse(msg.chunks);
    } catch {}
  }

  return (
    <div className="mb-4">
      {/* layout-only wrapper; aligns to the same container edges as your input,
        because ChatPage already wraps messages in max-w-4xl mx-auto px-4 */}
      <div
        className={`w-full flex flex-col gap-2 ${
          isUser ? "items-end" : "items-start"
        }`}
      >
        {/* ===== IMAGES BUBBLE (right for user) ===== */}
        {imageAtts.length > 0 && (
          <div
            className={`inline-block rounded-lg p-2 shadow ${
              isUser
                ? `bg-blue-100 ${USER_BUBBLE_MAX}`
                : `bg-gray-100 ${ASSIST_BUBBLE_MAX}`
            }`}
          >
            <div
              className={`flex flex-wrap gap-2 ${
                isUser ? "justify-end" : "justify-start"
              }`}
            >
              {imageAtts.map((att, i) => {
                const src =
                  att?.meta?.display_url ||
                  att?.display_url ||
                  att?.displayUrl ||
                  att?.url ||
                  null;
                const key =
                  att.url ||
                  att?.meta?.display_url ||
                  att.display_url ||
                  `${att.name || "img"}_${i}`;

                return (
                  <div
                    key={key}
                    className="border rounded-md overflow-hidden bg-white"
                  >
                    <img
                      data-role="att-img"
                      src={src}
                      alt={att.name || `image-${i}`}
                      className="block w-28 h-28 sm:w-32 sm:h-32 object-cover"
                      loading="lazy"
                      onError={(e) => {
                        const fallbacks = [
                          att.meta?.display_url,
                          att.display_url,
                          att.displayUrl,
                          att.url,
                        ].filter(Boolean);
                        const current = e.currentTarget.src;
                        const next = fallbacks.find((u) => u && u !== current);
                        if (next) e.currentTarget.src = next;
                        else e.currentTarget.style.display = "none";
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ===== NON-IMAGE FILES BUBBLE (right for user) ===== */}
        {fileAtts.length > 0 && (
          <div
            className={`inline-block rounded-lg p-2 shadow ${
              isUser
                ? `bg-blue-100 ${USER_BUBBLE_MAX}`
                : `bg-gray-100 ${ASSIST_BUBBLE_MAX}`
            }`}
          >
            <div
              className={`flex flex-wrap gap-2 ${
                isUser ? "justify-end" : "justify-start"
              }`}
            >
              {fileAtts.map((att, i) => {
                const url =
                  att.url ||
                  att.meta?.display_url ||
                  att.display_url ||
                  att.displayUrl;
                const key = `${att.name || att.filename || i}__${url || i}`;
                return (
                  <a
                    key={key}
                    className="text-blue-600 underline break-all text-sm bg-white/60 border rounded px-2 py-1"
                    href={url || "#"}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => !url && e.preventDefault()}
                    title={att.name || att.filename || "file"}
                  >
                    {att.name || att.filename || "file"}
                  </a>
                );
              })}
            </div>
          </div>
        )}

        {/* ===== TEXT BUBBLE (right for user) ===== */}
        {(() => {
          const content =
            typeof msg.content === "string" ? msg.content.trim() : "";
          if (!content) return null;

          return (
            <div
              // className={`inline-block rounded-lg p-3 shadow ${
              //   isUser
              //     ? `bg-blue-100 text-right ${USER_BUBBLE_MAX}`
              //     : `bg-gray-100 ${ASSIST_BUBBLE_MAX}`
              // }`}

              className={`inline-block rounded-lg p-3  ${
                isUser
                  ? `bg-blue-100 text-right ${USER_BUBBLE_MAX}`
                  : `bg-transparent`
              }`}
            >
              <div className="prose max-w-none">{renderContent(msg)}</div>

              {!isUser && (
                <div className="mt-2">
                  <MessageActions
                    onCopy={() => onCopy(msg)}
                    onUpvote={() => console.log("👍", msg)}
                    onDownvote={() => console.log("👎", msg)}
                    onSpeak={() => console.log("🔊", msg)}
                    onShare={() => onDownload(msg)}
                    onRetry={() => console.log("🔁", msg)}
                  />
                </div>
              )}

              {/* Citations */}
              {!isUser &&
                Array.isArray(msg.citations) &&
                msg.citations.length > 0 && (
                  <ul className="mt-4 text-xs text-gray-500 space-y-2">
                    {msg.citations.map((c, i) => {
                      // console.debug("📎 Rendering citation:", c);
                      if (!c?.source) {
                        return (
                          <li key={i} className="text-red-500">
                            ⚠️ Missing citation source
                          </li>
                        );
                      }

                      try {
                        const url = new URL(c.source);
                        const fileName = decodeURIComponent(
                          url.pathname.split("/").pop()
                        );

                        return (
                          <li key={i}>
                            🔗{" "}
                            <a
                              href={url.toString()}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="underline hover:text-blue-600"
                            >
                              {url.hostname}
                              {fileName && ` › ${fileName}`}
                            </a>
                            {c.page && <> — Page {c.page}</>}
                            {/* Quote */}
                            {c.quote && (
                              <blockquote className="ml-4 mt-1 italic text-gray-600 border-l-2 border-gray-300 pl-3">
                                {c.quote}
                              </blockquote>
                            )}
                            {/* PDF Preview Icon */}
                            {url.pathname.endsWith(".pdf") && (
                              <div className="ml-4 mt-1 flex items-center gap-2">
                                <img
                                  src="/pdf-icon.png"
                                  alt="PDF"
                                  className="w-4 h-4"
                                />
                                <span className="text-xs text-gray-500">
                                  PDF Document
                                </span>
                              </div>
                            )}
                          </li>
                        );
                      } catch (e) {
                        console.error("❌ Invalid citation URL:", c.source, e);
                        return (
                          <li key={i} className="text-red-500">
                            ⚠️ Malformed URL: {c.source}
                          </li>
                        );
                      }
                    })}
                  </ul>
                )}

              {!isUser &&
                Array.isArray(msg.chunks) &&
                msg.chunks.length > 0 && (
                  <div className="mt-2 text-xs text-gray-500">
                    📄 Chunks used: {msg.chunks.length}
                  </div>
                )}

              {msg.file && (
                <div
                  className={`mt-3 flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${
                    isUser
                      ? "bg-blue-200 text-blue-800 justify-end"
                      : "bg-gray-200 text-gray-700 justify-start"
                  }`}
                >
                  <FileText size={16} />
                  <span>{msg.file.name}</span>
                </div>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
