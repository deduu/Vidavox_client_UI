import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";

import MessageActions from "./MessageActions";
import { FileText, Brain, ChevronDown } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import CodeRenderer from "../renderer/CodeRenderer";
import CodeBlock from "../renderer/CodeBlock";

// === Bubble layout settings ===
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
      <pre className="text-xs overflow-x-auto whitespace-pre-wrap break-words">
        <code>{content}</code>
      </pre>
    </details>
  </div>
);

/* =========================
 * Professional Thinking Block Component
 * ========================= */
const ThinkingBlock = ({ reasoning, autoExpanded, onToggle, isStreaming }) => {
  const [isOpen, setIsOpen] = useState(autoExpanded);

  useEffect(() => {
    setIsOpen(autoExpanded);
  }, [autoExpanded]);

  const handleToggle = () => {
    const newState = !isOpen;
    setIsOpen(newState);
    onToggle?.(newState);
  };

  return (
    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg shadow-sm">
      <button
        onClick={handleToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/50 transition-colors duration-200 group"
        aria-expanded={isOpen}
        aria-label="Toggle reasoning section"
      >
        <div className="flex items-center gap-2.5">
          <Brain className="w-4 h-4 text-indigo-600" strokeWidth={2} />
          <span className="font-semibold text-gray-700 text-sm">
            Reasoning Process
          </span>
          <span className="text-xs text-gray-500 font-normal">
            ({reasoning.split(/\s+/).length} words)
          </span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-indigo-600 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="px-4 pb-4 pt-1">
          <div className="bg-white rounded-md p-3 border border-indigo-100">
            <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap font-mono max-h-[400px] overflow-y-auto">
              {reasoning}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

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

const attachmentSrc = (att) => att?.meta?.display_url || null;

/* =========================
 * Chat Message Component
 * ========================= */
export default function ChatMessage({ msg, onCopy, onEdit, onDownload }) {
  const [autoExpanded, setAutoExpanded] = useState(true);
  const isUser = msg.role === "user";

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

  useEffect(() => {
    if (msg.role === "assistant" && !msg.streaming) {
      const timer = setTimeout(() => setAutoExpanded(false), 500);
      return () => clearTimeout(timer);
    }
  }, [msg.role, msg.streaming]);

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
  const stripToolCalls = (text) =>
    text.replace(/<tool_call>[\s\S]*?<\/tool_call>/gi, "").trim();

  const looksLikeHtml = (text) =>
    /<\/?(div|p|span|pre|code|table|ul|ol|li|h1|h2|h3|blockquote|br)\b/i.test(
      text
    );

  const renderContent = (msg) => {
    let content = typeof msg.content === "string" ? msg.content.trim() : "";
    content = stripToolCalls(content);
    if (!content) return <TextRenderer content="" />;

    // 🧠 Detect reasoning tags first (<thinking> or <think>)
    const thinkingMatch = content.match(
      /<(think|thinking)>([\s\S]*?)<\/(think|thinking)>/i
    );

    // Extract reasoning and visible part
    const reasoning = thinkingMatch ? thinkingMatch[2].trim() : null;
    const visiblePart = thinkingMatch
      ? content.replace(thinkingMatch[0], "").trim()
      : content;

    // 🪄 Render collapsible reasoning if exists
    const reasoningBlock = reasoning ? (
      <ThinkingBlock
        reasoning={reasoning}
        autoExpanded={autoExpanded}
        onToggle={setAutoExpanded}
        isStreaming={msg.streaming}
      />
    ) : null;

    // 🧩 Format detection (but only render visible part in bubble)
    try {
      if (
        msg.format === "json" ||
        (visiblePart.startsWith("{") && visiblePart.endsWith("}")) ||
        (visiblePart.startsWith("[") && visiblePart.endsWith("]"))
      ) {
        return (
          <div className="space-y-3">
            {reasoningBlock}
            <JsonRenderer content={visiblePart} />
          </div>
        );
      }
    } catch {}

    if (
      msg.format === "html" ||
      (looksLikeHtml(visiblePart) &&
        !visiblePart.match(/<\/?(think|thinking)>/i))
    ) {
      return (
        <div
          className={`inline-block rounded-lg p-3 shadow-sm ${
            isUser
              ? `bg-blue-100 text-right ${USER_BUBBLE_MAX}`
              : `bg-gray-50 border ${ASSIST_BUBBLE_MAX}`
          }`}
        >
          {reasoningBlock}
          <HtmlRenderer content={visiblePart} />
        </div>
      );
    }

    if (msg.format === "code" || msg.language) {
      return (
        <div className="space-y-3">
          {reasoningBlock}
          <CodeRenderer content={visiblePart} language={msg.language} />
        </div>
      );
    }

    const isProbablyMarkdown = (text) =>
      text.includes("```") ||
      text.includes("**") ||
      text.includes("# ") ||
      text.match(/\[.+\]\((http.*)\)/) ||
      text.match(/^\d+\.\s+/m) ||
      text.match(/^[-*+]\s+/m);

    if (msg.format === "markdown" || isProbablyMarkdown(visiblePart)) {
      return (
        <div className="space-y-3">
          {reasoningBlock}
          <MarkdownRenderer content={visiblePart} />
        </div>
      );
    }

    // Default plain text
    return (
      <div className="space-y-3">
        {reasoningBlock}
        <TextRenderer content={visiblePart} />
      </div>
    );
  };

  return (
    <div className="mb-4">
      <div
        className={`w-full flex flex-col gap-2 ${
          isUser ? "items-end" : "items-start"
        }`}
      >
        {/* ===== IMAGES BUBBLE ===== */}
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

        {/* ===== NON-IMAGE FILES BUBBLE ===== */}
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

        {/* ===== TEXT BUBBLE ===== */}
        {(() => {
          const content =
            typeof msg.content === "string" ? msg.content.trim() : "";
          if (!content) return null;

          return (
            <div
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
                            {c.quote && (
                              <blockquote className="ml-4 mt-1 italic text-gray-600 border-l-2 border-gray-300 pl-3">
                                {c.quote}
                              </blockquote>
                            )}
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
