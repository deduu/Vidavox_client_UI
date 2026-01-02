// src/components/ExtractedPageViewer.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { STORAGE, loadJSON, saveJSON } from "../utils/persist";

// 1) log when gfm is registered
function remarkGfmWithLog(...args) {
  console.log("[remark-gfm] registered", ...args);
  // forward the same `this` to the real plugin
  return remarkGfm.apply(this, args);
}

// 2) log AST after remark runs
const astLogger = () => (tree) => {
  const types = [];
  (function walk(n) {
    types.push(n.type);
    (n.children || []).forEach(walk);
  })(tree);
  console.log("[remark] AST types:", types);
  console.log("[remark] contains table?", types.includes("table"));
};

// Normalize single-line markdown tables from OCR
function normalizeMdTable(raw) {
  if (!raw || typeof raw !== "string") return raw;
  let s = raw.trim();

  // If backend flattened rows, reinsert line breaks between cells/rows.
  if (!/\n/.test(s)) {
    s = s.replace(/\|\s*\|/g, "|\n|"); // turn "||" (or "|   |") into a newline
  }
  // Ensure header divider is on its own line
  s = s.replace(
    /(\|\s*[^|]+\s*\|(?:\s*\|[^|]+\s*\|)*)\s*(\|[:\-].*\|)/,
    "$1\n$2"
  );

  return s;
}

function looksLikeMarkdownTable(s = "") {
  if (typeof s !== "string") return false;
  const lines = s.split("\n");
  if (!/\|/.test(s)) return false;
  const hasDivider = lines.some((l) => /:?-{2,}:?/.test(l));
  const rowish = /^\s*\|.*\|/.test(lines[0] || "");
  return hasDivider || rowish;
}

export default function ExtractedPageViewer({
  pages,
  initialPage = 0,
  showImages = false,
  previewHeight = 640, // px
}) {
  const [activePage, setActivePage] = useState(initialPage);
  const [zoom, setZoom] = useState(1); // used when mode === "manual"
  const [mode, setMode] = useState("fit-width"); // "fit-width" | "fit-page" | "manual"

  // container + image sizing for fit calculations
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });

  // Rehydrate persisted state
  useEffect(() => {
    const saved = loadJSON(STORAGE.PAGE_VIEWER, {});
    if (saved?.page != null) setActivePage(saved.page);
    if (saved?.zoom != null) setZoom(saved.zoom);
    if (saved?.mode) setMode(saved.mode);
  }, []);

  // Persist on change
  useEffect(() => {
    saveJSON(STORAGE.PAGE_VIEWER, { page: activePage, zoom, mode });
  }, [activePage, zoom, mode]);

  // Track container width
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect;
      if (r?.width) setContainerWidth(r.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const current = pages?.[activePage];

  // Compute applied zoom based on mode
  const appliedZoom = useMemo(() => {
    if (!current || !imgSize.w || !imgSize.h || !containerWidth) return zoom;
    if (mode === "fit-width") return containerWidth / imgSize.w;
    if (mode === "fit-page") {
      const zw = containerWidth / imgSize.w;
      const zh = previewHeight / imgSize.h;
      return Math.min(zw, zh);
    }
    return zoom; // manual
  }, [mode, zoom, containerWidth, imgSize, current, previewHeight]);

  if (!current)
    return <div className="text-gray-500">No page data available</div>;

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActivePage((p) => Math.max(0, p - 1))}
            disabled={activePage === 0}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded disabled:opacity-50"
          >
            ◀️ Previous
          </button>
          <span className="px-3 py-2 bg-blue-50 text-blue-800 rounded">
            Page {activePage + 1} of {pages.length}
          </span>
          <button
            onClick={() =>
              setActivePage((p) => Math.min(pages.length - 1, p + 1))
            }
            disabled={activePage === pages.length - 1}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded disabled:opacity-50"
          >
            Next ▶️
          </button>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-700">View</label>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setMode("fit-width")}
              className={`px-3 py-2 rounded border ${
                mode === "fit-width"
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white"
              }`}
            >
              Fit width
            </button>
            <button
              onClick={() => setMode("fit-page")}
              className={`px-3 py-2 rounded border ${
                mode === "fit-page"
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white"
              }`}
            >
              Fit page
            </button>
            <button
              onClick={() => setMode("manual")}
              className={`px-3 py-2 rounded border ${
                mode === "manual"
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white"
              }`}
            >
              Manual
            </button>
          </div>

          {mode === "manual" && (
            <select
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="ml-2 border rounded px-3 py-2"
            >
              {[0.5, 0.75, 1, 1.25, 1.5, 2].map((z) => (
                <option key={z} value={z}>
                  {z * 100}%
                </option>
              ))}
            </select>
          )}

          <span className="text-xs text-gray-500 ml-1">
            {Math.round(appliedZoom * 100)}%
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Original page (scrollable) */}
        <div className="bg-white p-4 rounded-xl shadow border border-gray-100">
          <h3 className="text-lg font-semibold mb-3 flex items-center text-red-500">
            📄 Original PDF Page
          </h3>
          <div
            ref={containerRef}
            className="rounded-lg border bg-gray-50 overflow-auto"
            style={{ height: previewHeight }}
          >
            <div style={{ width: `${appliedZoom * 100}%`, minWidth: "100%" }}>
              <img
                src={`data:image/jpeg;base64,${current.image}`}
                alt="PDF page"
                className="block w-full h-auto select-none"
                draggable={false}
                onLoad={(e) => {
                  const img = e.currentTarget;
                  setImgSize({
                    w: img.naturalWidth || 0,
                    h: img.naturalHeight || 0,
                  });
                }}
              />
            </div>
          </div>
        </div>

        {/* Right: Extracted Content */}
        <div className="bg-white p-4 rounded-xl shadow border border-gray-100">
          <h3 className="text-lg font-semibold mb-3 flex items-center text-green-600">
            📄 Extracted Content
          </h3>

          <div className="space-y-4 text-sm text-gray-800 max-h-[640px] overflow-auto">
            {current.elements?.map((el) => {
              if (el.type === "text") {
                return (
                  <div
                    key={`t-${el.idx}`}
                    className="pb-2 border-b border-dashed"
                  >
                    <p>
                      <strong>[{el.idx}]</strong> {el.text}
                    </p>
                  </div>
                );
              }

              if (el.type === "image") {
                const isTable = looksLikeMarkdownTable(el.text);

                if (isTable) {
                  const fixed = normalizeMdTable(el.text);
                  console.debug("[table] raw:", el.text);
                  console.debug("[table] fixed:", fixed);

                  return (
                    <div
                      key={`i-${el.idx}`}
                      className="pb-3 border-b border-dashed"
                    >
                      <div className="bg-gray-50 p-3 rounded border overflow-auto">
                        <div className="prose prose-sm max-w-none">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfmWithLog, astLogger]}
                            components={{
                              table: (props) => {
                                console.log("[render] <table> rendered");
                                return <table {...props} />;
                              },
                            }}
                          >
                            {fixed}
                          </ReactMarkdown>
                        </div>
                      </div>
                    </div>
                  );
                }

                // Not a table → optionally show the figure
                if (showImages && el.image_metadata?.image_base64) {
                  return (
                    <div
                      key={`i-${el.idx}`}
                      className="pb-3 border-b border-dashed"
                    >
                      <div className="bg-gray-50 p-3 rounded border">
                        <img
                          src={el.image_metadata.image_base64}
                          alt={el.image_metadata?.caption || "Figure"}
                          className="w-full max-w-[640px] h-auto"
                        />
                        {el.image_metadata?.caption && (
                          <p className="text-xs text-gray-500 italic mt-2">
                            {el.image_metadata.caption}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                }
              }

              return null;
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
