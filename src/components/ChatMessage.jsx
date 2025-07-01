import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";

export default function ChatMessage({ msg, onCopy, onEdit, onDownload }) {
  const isUser = msg.role === "user";
  // Optional: sanitize/clean content
  const safeContent = msg.content?.trim() || "";
  return (
    /* 1️⃣  The element you actually hover needs `group` */
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
      {/* ← outer flex keeps alignment, but the bubble itself is the group */}
      <div className="relative max-w-lg group">
        <div
          className={`p-3 rounded-lg ${
            isUser ? "bg-blue-100 text-right" : "bg-gray-100"
          }`}
        >
          <ReactMarkdown rehypePlugins={[rehypeSanitize]}>
            {safeContent}
          </ReactMarkdown>
        </div>
        {/* 2️⃣  Safer anchor & z-index so it isn’t clipped / hidden */}
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

        {/* citations & chunks */}
        {!isUser && msg.citations?.length > 0 && (
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
        {!isUser && msg.chunks?.length > 0 && (
          <div className="mt-2 text-xs text-gray-500">
            📄 Chunks: {msg.chunks.length}
          </div>
        )}
      </div>
    </div>
  );
}
