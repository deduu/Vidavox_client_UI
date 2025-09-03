import React, { useState, useMemo, useRef, useEffect, useContext } from "react";
import { AuthContext } from "../../contexts/AuthContext";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { THEME } from "../../constants/theme";
import { useClipboard } from "../../hooks/useClipboard";
import {
  calculateStats,
  formatBytes,
  buildJsonStringFromResult,
  buildMarkdownFromPages,
} from "../../utils/extraction";
import { downloadFile } from "../../utils/download";
import { STORAGE, loadJSON, saveJSON } from "../../utils/persist";
import PageAnnotator from "./PageAnnotator";

// point to your *app* API, not the extractor
const API_BASE = import.meta?.env?.VITE_APP_API_BASE || "http://localhost:8005";

// Updated toAbs function to handle authentication
const toAbs = (url, authHeaders = {}) => {
  if (!url) return null;
  if (url.startsWith("http")) return url;

  const baseUrl = `${API_BASE}/v1/docparser${
    url.startsWith("/") ? "" : "/"
  }${url}`;

  return baseUrl;
};
const EMPTY_HEADERS = Object.freeze({});
export default function ResultsViewer({
  file,
  result,
  isCompleted,
  extractionOptions,
  activeTab,
  onTabChange,
  isFullscreen = false,
  onToggleFullscreen = () => {},
  className = "",
  userHeaders,
}) {
  const { copyToClipboard } = useClipboard();
  const { user, token, getAuthHeaders } = useContext(AuthContext);

  // Page navigation state
  const [activePage, setActivePage] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [mode, setMode] = useState("fit-width");

  // Container and image sizing
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });
  // base headers only change when the token changes
  const baseHeaders = useMemo(() => {
    return token ? { Authorization: `Bearer ${token}` } : EMPTY_HEADERS;
  }, [token]);

  const extraHeaders = userHeaders ?? EMPTY_HEADERS;

  // Only re-create when the *contents* change
  const authHeaders = useMemo(() => {
    // Don't set Content-Type for GET; PageAnnotator adds Accept
    return { ...baseHeaders, ...extraHeaders };
  }, [JSON.stringify(baseHeaders), JSON.stringify(extraHeaders)]);
  // Memoized computations
  const stats = useMemo(() => {
    return result?.extraction_result
      ? calculateStats(result.extraction_result)
      : { pages: 0, textBlocks: 0, tables: 0, time: "—" };
  }, [result]);

  const jsonText = useMemo(() => {
    return result?.extraction_result
      ? buildJsonStringFromResult(result.extraction_result)
      : "";
  }, [result]);

  const markdownText = useMemo(() => {
    return result?.extraction_result?.pages
      ? buildMarkdownFromPages(result.extraction_result.pages)
      : "";
  }, [result]);

  const pages = result?.extraction_result?.pages || [];
  const current = pages[activePage];

  const currentPageMarkdown = useMemo(() => {
    if (!current) return "";
    const overridden = { ...current, index: activePage };
    return buildMarkdownFromPages([overridden]);
  }, [current, activePage]);

  useEffect(() => {
    if (!current) return;
    const rel = current.image_url ?? null;
    const abs = rel ? toAbs(rel) : null;
    console.log(
      "[ResultsViewer] activePage=",
      activePage,
      "rel=",
      rel,
      "abs=",
      abs
    );
  }, [activePage, current?.image_url]);

  // Debug logging for image URLs
  useEffect(() => {
    if (!current) return;
    const rel = current.image_url ?? null;
    const abs = rel ? toAbs(rel) : null;
    console.log(
      "[ResultsViewer] page:",
      activePage,
      "image_url:",
      rel,
      "abs:",
      abs
    );
  }, [activePage, current?.image_url]);

  // Rehydrate persisted state
  useEffect(() => {
    const saved = loadJSON(STORAGE.PAGE_VIEWER, {});
    if (saved?.page != null) setActivePage(saved.page);
    if (saved?.zoom != null) setZoom(saved.zoom);
    if (saved?.mode) setMode(saved.mode);
  }, []);

  // Persist state changes
  useEffect(() => {
    saveJSON(STORAGE.PAGE_VIEWER, { page: activePage, zoom, mode });
  }, [activePage, zoom, mode]);

  // Track container width for zoom calculations
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

  // Compute applied zoom based on mode
  const appliedZoom = useMemo(() => {
    const currentPage = current;
    if (!currentPage || !imgSize.w || !imgSize.h || !containerWidth) {
      return zoom;
    }
    if (mode === "fit-width") return containerWidth / imgSize.w;
    if (mode === "fit-page") {
      const paneHeight = 560; // keep in sync with PageAnnotator height
      const zw = containerWidth / imgSize.w;
      const zh = paneHeight / imgSize.h;
      return Math.min(zw, zh);
    }
    return zoom;
  }, [mode, zoom, containerWidth, imgSize, current]);

  // Prepare auth headers for PageAnnotator
  // Actions with enhanced feedback
  const handleJsonDownload = () => {
    if (!jsonText) return;
    const ok = downloadFile(
      jsonText,
      `${file?.name || "result"}.json`,
      "application/json"
    );
    if (!ok) alert("Download failed. Please try again.");
  };

  const handleMarkdownDownload = () => {
    if (!markdownText) return;
    const ok = downloadFile(
      markdownText,
      `${file?.name || "result"}.md`,
      "text/markdown"
    );
    if (!ok) alert("Download failed. Please try again.");
  };

  const handleJsonCopy = () =>
    copyToClipboard(jsonText, "JSON copied to clipboard!");
  const handleMarkdownCopy = () =>
    copyToClipboard(markdownText, "Markdown copied to clipboard!");

  if (!current) {
    return (
      <div className="h-full flex flex-col">
        <div
          className={`${THEME.glass} h-full flex flex-col items-center justify-center rounded-2xl shadow-xl p-16 text-center backdrop-blur-md border border-white/20`}
        >
          <div className="text-6xl mb-4 opacity-60">📄</div>
          <p className="text-gray-500 text-lg font-medium">
            No pages available
          </p>
          <p className="text-gray-400 text-sm mt-2">
            Upload a document to begin extraction
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${THEME.glass} h-full min-h-0 flex flex-col overflow-hidden rounded-2xl shadow-xl backdrop-blur-md border border-white/20 transition-all duration-300 hover:shadow-2xl ${className}`}
    >
      {/* ENHANCED HEADER */}
      <div
        className={`${THEME.softBar} px-6 py-5 border-b border-white/10 bg-gradient-to-r from-blue-50/50 to-purple-50/30`}
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          {/* File Info with enhanced styling */}
          {file && (
            <div className="flex items-center gap-4 min-w-0">
              <div className="text-blue-500 text-3xl p-2 bg-blue-100/50 rounded-xl backdrop-blur">
                📄
              </div>
              <div className="min-w-0">
                <h2 className="text-xl font-bold text-gray-800 truncate bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text">
                  {file.name}
                </h2>
                <div className="flex items-center gap-3 text-sm text-gray-600 mt-1">
                  <span className="font-medium">{formatBytes(file.size)}</span>
                  <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                  <span className="font-medium">{stats.pages} pages</span>
                  <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                  <StatusPill isCompleted={isCompleted} />
                </div>
              </div>
            </div>
          )}

          {/* Enhanced right side controls */}
          <div className="flex items-center gap-4">
            <StatChip
              icon="⏱️"
              label="Processing time"
              value={stats.time || "—"}
            />
            <div className="w-px h-8 bg-gray-200"></div>
            <EnhancedIconOnly
              title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              ariaLabel={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              onClick={onToggleFullscreen}
            >
              {isFullscreen ? "🗗" : "🗖"}
            </EnhancedIconOnly>
          </div>
        </div>
      </div>

      {/* ENHANCED TOOLBAR */}
      <div className="px-6 py-4 bg-gradient-to-r from-white/80 to-gray-50/80 backdrop-blur border-b border-white/20">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Enhanced Page Navigation */}
          <div className="flex items-center gap-3">
            <EnhancedToolbarBtn
              title="Previous page"
              onClick={() => setActivePage((p) => Math.max(0, p - 1))}
              disabled={activePage === 0}
            >
              ◀️
            </EnhancedToolbarBtn>
            <div className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg text-sm font-semibold shadow-md">
              Page {activePage + 1} of {pages.length}
            </div>
            <EnhancedToolbarBtn
              title="Next page"
              onClick={() =>
                setActivePage((p) => Math.min(pages.length - 1, p + 1))
              }
              disabled={activePage === pages.length - 1}
            >
              ▶️
            </EnhancedToolbarBtn>
          </div>

          {/* Enhanced View Controls */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-600">
              Display mode
            </span>
            <div className="flex rounded-xl overflow-hidden border border-gray-200 shadow-sm bg-white">
              <EnhancedSegBtn
                active={mode === "fit-width"}
                onClick={() => setMode("fit-width")}
              >
                Fit Width
              </EnhancedSegBtn>
              <EnhancedSegBtn
                active={mode === "fit-page"}
                onClick={() => setMode("fit-page")}
                divider
              >
                Fit Page
              </EnhancedSegBtn>
              <EnhancedSegBtn
                active={mode === "manual"}
                onClick={() => setMode("manual")}
                divider
              >
                Manual
              </EnhancedSegBtn>
            </div>
            {mode === "manual" && (
              <select
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="ml-2 border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium bg-white shadow-sm hover:border-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                {[0.5, 0.75, 1, 1.25, 1.5, 2].map((z) => (
                  <option key={z} value={z}>
                    {z * 100}%
                  </option>
                ))}
              </select>
            )}
            <span className="text-xs text-gray-500 font-mono ml-2 px-2 py-1 bg-gray-100 rounded-md">
              {Math.round(appliedZoom * 100)}%
            </span>
          </div>
        </div>
      </div>

      {/* ENHANCED CONTENT */}
      <div className="flex-1 min-h-0 p-6 overflow-hidden bg-gradient-to-br from-gray-50/30 to-white/50">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 flex-1 min-h-0 h-full">
          {/* LEFT: Enhanced Original PDF Page */}
          <EnhancedPane
            title={
              <>
                <span className="mr-3 text-xl">📄</span>
                <span className="font-semibold">Original Document</span>
              </>
            }
            subtitle="Source PDF page"
          >
            {/* Attach the containerRef here so ResizeObserver can compute fit-width */}
            <div
              ref={containerRef}
              className="bg-gradient-to-br from-gray-100 to-gray-50 overflow-auto flex-1 min-h-0 h-full rounded-lg border border-gray-200/50"
            >
              {!current ? (
                <div className="h-full flex items-center justify-center text-gray-500">
                  No pages available
                </div>
              ) : (
                <div
                  style={{ width: `${appliedZoom * 100}%`, minWidth: "100%" }}
                >
                  <PageAnnotator
                    imageUrl={
                      current.image_url ? toAbs(current.image_url) : null
                    }
                    imageBase64={current?.image}
                    elements={current?.elements || []}
                    showBoxes
                    visibleTypes={["text", "table", "image"]}
                    // NEW:
                    yOrigin={current?.y_origin || "top-left"}
                    coordWidth={current?.coord_width}
                    coordHeight={current?.coord_height}
                    onImageLoadNaturalSize={(w, h) => setImgSize({ w, h })}
                  />
                </div>
              )}
            </div>
          </EnhancedPane>

          {/* RIGHT: Markdown Preview */}
          <EnhancedPane
            title={
              <>
                <span className="mr-3 text-xl">📝</span>
                <span className="font-semibold">Extracted Content</span>
              </>
            }
            subtitle="Markdown preview"
            actions={
              <div className="flex items-center gap-2">
                <EnhancedActionBtn
                  title="Copy JSON to clipboard"
                  ariaLabel="Copy JSON"
                  onClick={handleJsonCopy}
                  variant="copy"
                >
                  📋
                </EnhancedActionBtn>
                <EnhancedActionBtn
                  title="Copy Markdown to clipboard"
                  ariaLabel="Copy Markdown"
                  onClick={handleMarkdownCopy}
                  variant="copy"
                >
                  📋
                </EnhancedActionBtn>
                <EnhancedActionBtn
                  title="Download as JSON file"
                  ariaLabel="Download JSON"
                  onClick={handleJsonDownload}
                  variant="download"
                >
                  ⬇️
                </EnhancedActionBtn>
                <EnhancedActionBtn
                  title="Download as Markdown file"
                  ariaLabel="Download Markdown"
                  onClick={handleMarkdownDownload}
                  variant="download"
                >
                  ⬇️
                </EnhancedActionBtn>
              </div>
            }
          >
            <div className="p-6 overflow-auto flex-1 min-h-0 h-full prose prose-sm max-w-none bg-white/50 rounded-lg border border-gray-200/50">
              {currentPageMarkdown ? (
                <div className="animate-fadeIn">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {currentPageMarkdown}
                  </ReactMarkdown>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <div className="text-5xl mb-3 opacity-60">📝</div>
                  <p className="text-lg font-medium">No content extracted</p>
                  <p className="text-sm mt-1">
                    This page may be empty or contain only images
                  </p>
                </div>
              )}
            </div>
          </EnhancedPane>
        </div>
      </div>
    </div>
  );
}

/* ——— Enhanced UI Subcomponents ——— */
function StatusPill({ isCompleted }) {
  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-semibold shadow-sm transition-all duration-200 ${
        isCompleted
          ? "bg-gradient-to-r from-green-500 to-green-600 text-white"
          : "bg-gradient-to-r from-blue-500 to-blue-600 text-white animate-pulse"
      }`}
    >
      {isCompleted ? "✓ Completed" : "⏳ Processing"}
    </span>
  );
}

function EnhancedIconOnly({ children, onClick, title, ariaLabel }) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={ariaLabel}
      className="inline-flex items-center justify-center w-10 h-10 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 text-lg transition-all duration-200 hover:scale-105 hover:shadow-md active:scale-95"
    >
      {children}
    </button>
  );
}

function EnhancedToolbarBtn({ children, onClick, disabled, title }) {
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all duration-200 ${
        disabled
          ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-60"
          : "bg-white hover:bg-gray-50 text-gray-800 border-gray-200 hover:border-gray-300 hover:shadow-sm active:scale-95"
      }`}
    >
      {children}
    </button>
  );
}

function EnhancedSegBtn({ active, onClick, children, divider }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium transition-all duration-200 relative ${
        active
          ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-sm"
          : "bg-white hover:bg-gray-50 text-gray-700 hover:text-gray-900"
      } ${divider ? "border-l border-gray-200" : ""}`}
    >
      {children}
      {active && (
        <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-blue-600/20 rounded-lg"></div>
      )}
    </button>
  );
}

function EnhancedPane({ title, subtitle, actions, children }) {
  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/50 overflow-hidden transition-all duration-300 hover:shadow-xl h-full flex flex-col min-h-0">
      <div className="bg-gradient-to-r from-gray-50/80 to-white/80 px-5 py-4 border-b border-gray-200/50 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-gray-800 flex items-center text-base">
              {title}
            </h3>
            {subtitle && (
              <p className="text-xs text-gray-500 mt-1 font-medium">
                {subtitle}
              </p>
            )}
          </div>
          {actions && <div className="flex items-center gap-1">{actions}</div>}
        </div>
      </div>
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
}

function StatChip({ icon, label, value }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-white/90 backdrop-blur-sm rounded-xl border border-white/50 text-sm shadow-sm hover:shadow-md transition-all duration-200">
      <span className="text-lg">{icon}</span>
      <div className="flex flex-col">
        <span className="text-gray-800 font-semibold text-sm">{value}</span>
        <span className="text-gray-500 text-xs font-medium">{label}</span>
      </div>
    </div>
  );
}

function EnhancedActionBtn({
  children,
  onClick,
  title,
  ariaLabel,
  variant = "default",
}) {
  const baseClasses =
    "inline-flex items-center justify-center w-9 h-9 rounded-lg text-sm transition-all duration-200 hover:scale-105 active:scale-95";

  const variantClasses = {
    copy: "bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 hover:border-blue-300",
    download:
      "bg-green-50 hover:bg-green-100 text-green-600 border border-green-200 hover:border-green-300",
    default:
      "bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-200 hover:border-gray-300",
  };

  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={ariaLabel}
      className={`${baseClasses} ${variantClasses[variant]} hover:shadow-sm`}
    >
      {children}
    </button>
  );
}

/* Add custom animations */
const style = document.createElement("style");
style.textContent = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  .animate-fadeIn {
    animation: fadeIn 0.3s ease-out;
  }
`;
document.head.appendChild(style);
