import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";

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

const MarkdownRenderer = ({ content }) => (
  <div className="prose  max-w-none">
    <ReactMarkdown
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
      {content}
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

  // Try Markdown
  if (
    msg.format === "markdown" ||
    content.includes("```") ||
    content.includes("**") ||
    content.includes("# ") ||
    content.match(/^\d+\.\s+/m) || // numbered list
    content.match(/^[-*+]\s+/m) // bullets
  ) {
    return <MarkdownRenderer content={content} />;
  }

  // Default plain text
  return <TextRenderer content={content} />;
};

// === Chat Message Component ===

export default function ChatMessage({ msg, onCopy, onEdit, onDownload }) {
  const isUser = msg.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
      <div className="relative max-w-lg group">
        <div
          className={`p-3 rounded-lg prose max-w-none ${
            isUser ? "bg-blue-100 text-right" : "bg-gray-100"
          }`}
        >
          {renderContent(msg)}
        </div>

        {/* Action buttons */}
        <div
          className="absolute top-0 right-0 translate-x-1/2 -translate-y-1/2 
                     flex gap-1 text-xs bg-white border rounded shadow-sm p-1 
                     opacity-0 group-hover:opacity-100 transition-opacity duration-200
                     z-10"
        >
          <button
            onClick={() => onCopy(msg)}
            title="Copy"
            className="hover:text-blue-600"
          >
            📋
          </button>
          {isUser ? (
            <button
              onClick={() => onEdit(msg)}
              title="Edit"
              className="hover:text-green-600"
            >
              ✏️
            </button>
          ) : (
            <button
              onClick={() => onDownload(msg)}
              title="Download"
              className="hover:text-purple-600"
            >
              ⬇️
            </button>
          )}
        </div>

        {/* Citations */}
        {!isUser &&
          Array.isArray(msg.citations) &&
          msg.citations.length > 0 && (
            <ul className="mt-2 text-xs text-gray-500 space-y-1">
              {msg.citations.map((c, i) => (
                <li key={i}>
                  🔗{" "}
                  <a
                    href={c.source}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-blue-600"
                  >
                    {c.source}
                  </a>
                  {c.page && <> — Page {c.page}</>}
                </li>
              ))}
            </ul>
          )}

        {/* Chunks */}
        {!isUser && Array.isArray(msg.chunks) && msg.chunks.length > 0 && (
          <div className="mt-2 text-xs text-gray-500">
            📄 Chunks: {msg.chunks.length}
          </div>
        )}
      </div>
    </div>
  );
}
