import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";

import MessageActions from "./MessageActions";
import { FileText } from "lucide-react"; //

// === Format-specific Renderers ===

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
  <div className="prose  max-w-none">
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
            ],
            attributes: { a: ["href", "target", "rel"] },
          },
        ],
      ]}
    >
      {fixBrokenLinks(content)}
    </ReactMarkdown>
  </div>
);

const TextRenderer = ({ content }) => (
  <div className="whitespace-pre-wrap  text-gray-800">{content}</div>
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

const CodeRenderer = ({ content, language }) => (
  <div className="bg-gray-900 text-green-400 p-3 rounded">
    <div className="text-xs text-gray-400 mb-2">{language || "Code"}</div>
    <pre className="text-sm overflow-x-auto">
      <code>{content}</code>
    </pre>
  </div>
);

// === Content Auto-Detection ===

const renderContent = (msg) => {
  const content = typeof msg.content === "string" ? msg.content.trim() : "";
  if (!content) return <TextRenderer content="" />;
  // console.log("📥 Rendering message:", msg);
  // console.log("📎 Citations:", msg.citations);
  // console.log("📦 Chunks:", msg.chunks);

  // Try JSON
  try {
    if (
      msg.format === "json" ||
      (content.startsWith("{") && content.endsWith("}")) ||
      (content.startsWith("[") && content.endsWith("]"))
    ) {
      return <JsonRenderer content={content} />;
    }
  } catch {}

  // Try HTML
  if (
    msg.format === "html" ||
    (content.includes("<") && content.includes(">") && content.includes("/"))
  ) {
    return <HtmlRenderer content={content} />;
  }

  // Try code
  if (msg.format === "code" || msg.language) {
    return <CodeRenderer content={content} language={msg.language} />;
  }
  const isProbablyMarkdown = (text) => {
    return (
      text.includes("```") ||
      text.includes("**") ||
      text.includes("# ") ||
      text.match(/\[.+\]\((http.*)\)/) || // ← detects [text](http://...)
      text.match(/^\d+\.\s+/m) || // numbered list
      text.match(/^[-*+]\s+/m) // bullets
    );
  };

  // Try Markdown
  // Try Markdown
  if (msg.format === "markdown" || isProbablyMarkdown(content)) {
    return <MarkdownRenderer content={content} />;
  }

  // Default plain text
  return <TextRenderer content={content} />;
};

// === Chat Message Component ===

export default function ChatMessage({ msg, onCopy, onEdit, onDownload }) {
  const isUser = msg.role === "user";
  // console.log("📥 msg:", msg);
  if (typeof msg.citations === "string") {
    try {
      msg.citations = JSON.parse(msg.citations);
    } catch {
      /* ignore */
    }
  }
  if (typeof msg.chunks === "string") {
    try {
      msg.chunks = JSON.parse(msg.chunks);
    } catch {
      /* ignore */
    }
  }
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
      <div className="relative max-w-2xl group">
        <div
          className={`p-3 rounded-lg max-w-none ${
            isUser ? "bg-blue-100 text-right" : "bg-gray-100"
          }`}
        >
          {Array.isArray(msg.attachments) && msg.attachments.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {msg.attachments.map((att, i) => {
                const isImage = (att.type || "").startsWith("image/");
                const src = att.display_url || att.url; // prefer object URL for instant preview
                return (
                  <div key={i} className="border rounded-md p-1 max-w-[200px]">
                    {isImage ? (
                      <img
                        src={src}
                        alt={att.name || "image"}
                        className="max-h-40 rounded"
                        onError={(e) => {
                          if (att.url && e.currentTarget.src !== att.url) {
                            e.currentTarget.src = att.url; // fallback to server URL
                          }
                        }}
                      />
                    ) : (
                      <a
                        className="text-blue-600 underline break-all"
                        href={att.url || att.display_url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {att.name || "file"}
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {msg.file && (
            <div
              className={`mb-3 flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${
                isUser
                  ? "bg-blue-200 text-blue-800"
                  : "bg-gray-200 text-gray-700"
              } ${isUser ? "justify-end" : "justify-start"}`}
            >
              <FileText size={16} />
              <span>{msg.file.name}</span>
            </div>
          )}
          {msg.file_url &&
            (msg.file_url.startsWith("data:image/") ||
              msg.file_url.startsWith("blob:")) && (
              <div className="my-2">
                <img
                  src={msg.file_url}
                  alt="Uploaded"
                  className="rounded max-w-xs border shadow"
                />
              </div>
            )}

          <div className="prose max-w-none">{renderContent(msg)}</div>

          {/* Floating Action Bar (assistant only) */}
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

          {/* Chunks */}
          {!isUser && Array.isArray(msg.chunks) && msg.chunks.length > 0 && (
            <div className="mt-2 text-xs text-gray-500">
              📄 Chunks used: {msg.chunks.length}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
