// components/CodeBlock.jsx
import { useMemo, useRef, useState, useEffect } from "react";
import hljs from "highlight.js";
import "highlight.js/styles/github.css";

export default function CodeBlock({ code, language }) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef(null);

  const { html, lang } = useMemo(() => {
    const raw = String(code ?? "");
    try {
      const res = language
        ? hljs.highlight(raw, { language, ignoreIllegals: true })
        : hljs.highlightAuto(raw);
      return { html: res.value, lang: res.language || language || "code" };
    } catch {
      return { html: hljs.escapeHTML(raw), lang: language || "code" };
    }
  }, [code, language]);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(String(code ?? ""));
      setCopied(true);
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 1200);
    } catch {
      // optional: show an error state instead
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-100 text-gray-800 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200">
        <div className="text-xs text-gray-600">{lang}</div>

        {/* Button with animated feedback */}
        <div className="relative">
          <button
            onClick={copyAll}
            className={`text-xs px-2 py-1 rounded border border-gray-300 transition
              ${copied ? "bg-green-100 border-green-300" : "hover:bg-white"}`}
            aria-label="Copy code"
            aria-live="polite"
          >
            <span
              className={`inline-flex items-center gap-1 transform transition
                ${copied ? "scale-105 text-green-700" : ""}`}
            >
              {copied ? (
                <>
                  {/* checkmark */}
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  Copied!
                </>
              ) : (
                <>Copy</>
              )}
            </span>
          </button>

          {/* subtle confetti dot */}
          <span
            className={`absolute -right-1 -top-1 h-2 w-2 rounded-full bg-green-500 transition-opacity duration-300
              ${copied ? "opacity-100" : "opacity-0"}`}
            aria-hidden
          />
        </div>
      </div>

      <pre className="hljs m-0 p-3 text-sm leading-6 overflow-x-auto">
        <code
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </pre>
    </div>
  );
}
