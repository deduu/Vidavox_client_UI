import React, {
  useState,
  useMemo,
  useRef,
  useEffect,
  useContext,
  useCallback,
} from "react";
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
  const [showBoxes, setShowBoxes] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // Enhanced state for better UX
  const [selectedElement, setSelectedElement] = useState(null);
  const [viewMode, setViewMode] = useState("split"); // split, pdf-only, content-only

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

  // Enhanced container width tracking with debouncing
  const updateContainerWidth = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setContainerWidth(rect.width);
    }
  }, []);

  // Rehydrate persisted state
  useEffect(() => {
    const saved = loadJSON(STORAGE.PAGE_VIEWER, {});
    if (saved?.page != null) setActivePage(saved.page);
    if (saved?.zoom != null) setZoom(saved.zoom);
    if (saved?.mode) setMode(saved.mode);
    if (saved?.viewMode) setViewMode(saved.viewMode);
  }, []);

  // Persist state changes
  useEffect(() => {
    saveJSON(STORAGE.PAGE_VIEWER, { page: activePage, zoom, mode, viewMode });
  }, [activePage, zoom, mode, viewMode]);

  // Enhanced container width tracking with proper cleanup
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let timeoutId;
    const debouncedUpdate = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(updateContainerWidth, 100);
    };

    const ro = new ResizeObserver(debouncedUpdate);
    ro.observe(el);

    // Initial measurement
    updateContainerWidth();

    // Handle fullscreen changes
    const handleFullscreenChange = () => {
      setTimeout(updateContainerWidth, 100);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("mozfullscreenchange", handleFullscreenChange);
    document.addEventListener("MSFullscreenChange", handleFullscreenChange);

    // Handle window resize
    window.addEventListener("resize", debouncedUpdate);

    return () => {
      ro.disconnect();
      clearTimeout(timeoutId);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener(
        "webkitfullscreenchange",
        handleFullscreenChange
      );
      document.removeEventListener(
        "mozfullscreenchange",
        handleFullscreenChange
      );
      document.removeEventListener(
        "MSFullscreenChange",
        handleFullscreenChange
      );
      window.removeEventListener("resize", debouncedUpdate);
    };
  }, [updateContainerWidth]);
  useEffect(() => {
    // after the DOM reflows due to view mode change, re-measure
    const id = requestAnimationFrame(() => updateContainerWidth());
    const id2 = setTimeout(updateContainerWidth, 120); // double-tap after CSS transitions
    return () => {
      cancelAnimationFrame(id);
      clearTimeout(id2);
    };
  }, [viewMode, activeTab]);
  // Enhanced fullscreen effect
  useEffect(() => {
    // Trigger container width recalculation when fullscreen changes
    const timer = setTimeout(() => {
      updateContainerWidth();
    }, 200); // Allow time for fullscreen transition

    return () => clearTimeout(timer);
  }, [isFullscreen, updateContainerWidth]);

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

  // Actions with enhanced feedback and loading states
  const handleJsonDownload = useCallback(() => {
    if (!jsonText) return;
    setIsLoading(true);
    try {
      const ok = downloadFile(
        jsonText,
        `${file?.name || "result"}.json`,
        "application/json"
      );
      if (!ok) {
        throw new Error("Download failed");
      }
    } catch (error) {
      alert("Download failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [jsonText, file?.name]);

  const handleMarkdownDownload = useCallback(() => {
    if (!markdownText) return;
    setIsLoading(true);
    try {
      const ok = downloadFile(
        markdownText,
        `${file?.name || "result"}.md`,
        "text/markdown"
      );
      if (!ok) {
        throw new Error("Download failed");
      }
    } catch (error) {
      alert("Download failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [markdownText, file?.name]);

  const handleJsonCopy = useCallback(
    () => copyToClipboard(jsonText, "JSON copied to clipboard!"),
    [copyToClipboard, jsonText]
  );

  const handleMarkdownCopy = useCallback(
    () => copyToClipboard(markdownText, "Markdown copied to clipboard!"),
    [copyToClipboard, markdownText]
  );

  // Enhanced keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")
        return;

      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          setActivePage((p) => Math.max(0, p - 1));
          break;
        case "ArrowRight":
          e.preventDefault();
          setActivePage((p) => Math.min(pages.length - 1, p + 1));
          break;
        case "f":
        case "F":
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            onToggleFullscreen();
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pages.length, onToggleFullscreen]);

  // Determine grid layout based on view mode
  const getGridClasses = () => {
    switch (viewMode) {
      case "pdf-only":
        return "grid-cols-1";
      case "content-only":
        return "grid-cols-1";
      case "split":
      default:
        return "grid-cols-1 xl:grid-cols-2";
    }
  };

  return (
    <div
      className={`${THEME.glass} h-full min-h-0 flex flex-col overflow-hidden shadow-xl backdrop-blur-md border border-white/20 transition-all duration-300 hover:shadow-2xl ${className}`}
    >
      {/* Unified Header - FIXED VERSION */}
      <div
        className={`${THEME.softBar} px-4 sm:px-6 py-3 sm:py-4 border-b border-white/10 bg-gradient-to-r from-blue-50/50 to-purple-50/30`}
      >
        {/* Mobile-first layout with proper responsive breakpoints */}
        <div className="flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-4">
          {/* TOP ROW: File info + Page navigation (mobile: stacked, lg: side by side) */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 min-w-0 flex-1">
            {/* File Info - with proper truncation */}
            {file && (
              <div className="flex items-center gap-3 min-w-0 flex-shrink">
                <div className="relative flex-shrink-0">
                  <div className="text-blue-500 text-2xl sm:text-3xl p-2 sm:p-3 bg-gradient-to-br from-blue-100 to-blue-50 backdrop-blur border border-blue-200/50 shadow-sm">
                    📄
                  </div>

                  {isCompleted && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 bg-green-500 flex items-center justify-center shadow-lg">
                      <span className="text-white text-xs">✓</span>
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1 overflow-hidden">
                  <h2 className="text-lg sm:text-xl font-bold text-gray-800 truncate bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text">
                    {file.name}
                  </h2>
                  <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-gray-600 mt-1 flex-wrap">
                    <span className="font-medium px-2 py-1 bg-gray-100 rounded-md whitespace-nowrap">
                      {formatBytes(file.size)}
                    </span>
                    <span className="font-medium px-2 py-1 bg-blue-100 rounded-md text-blue-700 whitespace-nowrap">
                      {stats.pages} pages
                    </span>
                    <StatusPill isCompleted={isCompleted} />
                  </div>
                </div>
              </div>
            )}

            {/* Page Navigation - responsive sizing */}
            <div className="flex items-center gap-2 flex-shrink-0 self-start sm:self-auto">
              <EnhancedToolbarBtn
                title="Previous page (←)"
                onClick={() => setActivePage((p) => Math.max(0, p - 1))}
                disabled={activePage === 0}
                icon="◀️"
              />
              <div className="px-3 sm:px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-lg border border-blue-400 whitespace-nowrap">
                <span className="hidden sm:inline">Page </span>
                <span className="sm:hidden">P</span>
                {activePage + 1} / {pages.length}
              </div>
              <EnhancedToolbarBtn
                title="Next page (→)"
                onClick={() =>
                  setActivePage((p) => Math.min(pages.length - 1, p + 1))
                }
                disabled={activePage === pages.length - 1}
                icon="▶️"
              />
            </div>
          </div>

          {/* BOTTOM ROW: Controls - stack on mobile, horizontal on larger screens */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 border-t border-gray-200/50 pt-3 lg:border-t-0 lg:pt-0">
            {/* Stats + Divider */}
            <div className="flex items-center gap-3">
              <StatChip
                icon="⏱️"
                label="Processing"
                value={stats.time || "—"}
              />
              <div className="hidden sm:block w-px h-8 bg-gray-200/50"></div>
            </div>

            {/* View Mode - compact on mobile */}
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-medium text-gray-600 hidden md:inline whitespace-nowrap">
                View:
              </span>
              <div className="flex rounded-xl overflow-hidden border border-gray-200 shadow-sm bg-white">
                <ViewModeButton
                  active={viewMode === "split"}
                  onClick={() => setViewMode("split")}
                  title="Split view"
                  icon="⚌"
                />
                <ViewModeButton
                  active={viewMode === "pdf-only"}
                  onClick={() => setViewMode("pdf-only")}
                  title="PDF only"
                  icon="📄"
                  divider
                />
                <ViewModeButton
                  active={viewMode === "content-only"}
                  onClick={() => setViewMode("content-only")}
                  title="Content only"
                  icon="📝"
                  divider
                />
              </div>
            </div>

            {/* Display Controls - responsive grouping */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-0 border border-gray-200 rounded-xl overflow-hidden shadow-sm bg-white">
                <EnhancedSegBtn
                  active={mode === "fit-width"}
                  onClick={() => setMode("fit-width")}
                  title="Fit to width"
                >
                  <span className="hidden sm:inline">📐</span>
                  <span className="sm:hidden text-xs">W</span>
                </EnhancedSegBtn>
                <EnhancedSegBtn
                  active={mode === "fit-page"}
                  onClick={() => setMode("fit-page")}
                  title="Fit to page"
                  divider
                >
                  <span className="hidden sm:inline">🖼️</span>
                  <span className="sm:hidden text-xs">P</span>
                </EnhancedSegBtn>
                <EnhancedSegBtn
                  active={mode === "manual"}
                  onClick={() => setMode("manual")}
                  title="Manual zoom"
                  divider
                >
                  <span className="hidden sm:inline">🔍</span>
                  <span className="sm:hidden text-xs">Z</span>
                </EnhancedSegBtn>
              </div>

              {mode === "manual" && (
                <select
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="border border-gray-200 rounded-xl px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium bg-white shadow-sm min-w-0"
                >
                  {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4].map((z) => (
                    <option key={z} value={z}>
                      {z * 100}%
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Utility controls - compact group */}
            <div className="flex items-center gap-2">
              {/* Annotation toggle */}
              <EnhancedToggle
                checked={showBoxes}
                onChange={setShowBoxes}
                label="Annotations"
                labelClass="hidden sm:inline"
                title="Toggle annotation boxes"
              />

              <EnhancedIconOnly
                title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                ariaLabel={
                  isFullscreen ? "Exit fullscreen" : "Enter fullscreen"
                }
                onClick={onToggleFullscreen}
              >
                {isFullscreen ? "🗗" : "🗖"}
              </EnhancedIconOnly>
            </div>
          </div>
        </div>
      </div>

      {/* ENHANCED CONTENT */}
      <div className="flex-1 min-h-0 p-6 overflow-hidden bg-gradient-to-br from-gray-50/30 to-white/50">
        <div className={`grid ${getGridClasses()} gap-6 flex-1 min-h-0 h-full`}>
          {/* LEFT: Enhanced Original PDF Page */}
          {(viewMode === "split" || viewMode === "pdf-only") && (
            <EnhancedPane
              title={
                <>
                  <span className="mr-3 text-xl">📄</span>
                  <span className="font-semibold">Original Document</span>
                  <span className="ml-2 text-sm font-normal text-gray-500">
                    Page {activePage + 1}
                  </span>
                </>
              }
              subtitle="Source document with annotations"
            >
              <div
                ref={containerRef}
                className="bg-gradient-to-br from-gray-100 to-gray-50 overflow-auto flex-1 min-h-0 h-full border-gray-200/50 shadow-inner"
              >
                {!current ? (
                  <div className="h-full flex items-center justify-center text-gray-500">
                    <div className="text-center">
                      <div className="text-4xl mb-2 opacity-60">📄</div>
                      <p>No pages available</p>
                      {!isCompleted && (
                        <div className="mt-3 flex items-center gap-2 text-blue-600 justify-center">
                          <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                          <span className="text-sm">Processing...</span>
                        </div>
                      )}
                    </div>
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
                      showBoxes={showBoxes}
                      visibleTypes={["text", "table", "image"]}
                      yOrigin={current?.y_origin || "top-left"}
                      coordWidth={current?.coord_width}
                      coordHeight={current?.coord_height}
                      onImageLoadNaturalSize={(w, h) => setImgSize({ w, h })}
                      appliedZoom={appliedZoom}
                      onSelect={(idx, element) => setSelectedElement(element)}
                      selectedIdx={selectedElement?.idx}
                    />
                  </div>
                )}
              </div>
            </EnhancedPane>
          )}

          {/* RIGHT: Enhanced Content Preview */}
          {(viewMode === "split" || viewMode === "content-only") && (
            <EnhancedPane
              title={
                <>
                  <span className="mr-3 text-xl">📝</span>
                  <span className="font-semibold">Extracted Content</span>
                  {selectedElement && (
                    <span className="ml-2 text-sm font-normal text-blue-600">
                      Selected: {selectedElement.type}
                    </span>
                  )}
                </>
              }
              subtitle="Markdown preview of extracted text and tables"
              actions={
                <div className="flex items-center gap-2">
                  <EnhancedActionBtn
                    title="Copy JSON to clipboard"
                    ariaLabel="Copy JSON"
                    onClick={handleJsonCopy}
                    variant="copy"
                    icon="📋"
                    disabled={!jsonText}
                  />
                  <EnhancedActionBtn
                    title="Copy Markdown to clipboard"
                    ariaLabel="Copy Markdown"
                    onClick={handleMarkdownCopy}
                    variant="copy"
                    icon="📝"
                    disabled={!markdownText}
                  />
                  <EnhancedActionBtn
                    title="Download as JSON file"
                    ariaLabel="Download JSON"
                    onClick={handleJsonDownload}
                    variant="download"
                    icon="💾"
                    disabled={!jsonText || isLoading}
                    loading={isLoading}
                  />
                  <EnhancedActionBtn
                    title="Download as Markdown file"
                    ariaLabel="Download Markdown"
                    onClick={handleMarkdownDownload}
                    variant="download"
                    icon="📄"
                    disabled={!markdownText || isLoading}
                    loading={isLoading}
                  />
                </div>
              }
            >
              <div className="overflow-auto flex-1 min-h-0 h-full bg-white/70 border border-gray-200/50 shadow-inner">
                {currentPageMarkdown ? (
                  <div className="p-6 prose prose-sm max-w-none animate-fadeIn">
                    {/* <pre className="p-6 whitespace-pre-wrap break-words font-mono text-sm">
                      {currentPageMarkdown}
                    </pre> */}
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {currentPageMarkdown}
                    </ReactMarkdown>
                  </div>
                ) : (
                  // <pre className="p-6 whitespace-pre-wrap break-words font-mono text-sm text-black bg-white">
                  //   <code>{currentPageMarkdown}</code>
                  // </pre>
                  <div className="flex flex-col items-center justify-center h-full text-gray-400 p-6">
                    <div className="relative">
                      <div className="text-5xl mb-3 opacity-60">📝</div>
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500  flex items-center justify-center">
                        <span className="text-white text-xs">!</span>
                      </div>
                    </div>
                    <h4 className="text-lg font-semibold text-gray-600 mb-2">
                      No content extracted
                    </h4>
                    <p className="text-sm text-center max-w-md">
                      This page may contain only images, or the content
                      extraction is still in progress.
                    </p>
                    {!isCompleted && (
                      <div className="mt-3 flex items-center gap-2 text-blue-600">
                        <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                        <span className="text-sm">Processing...</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </EnhancedPane>
          )}
        </div>
      </div>
    </div>
  );
}

/* ——— Enhanced UI Subcomponents ——— */
function StatusPill({ isCompleted }) {
  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-semibold shadow-sm transition-all duration-200 flex items-center gap-2 ${
        isCompleted
          ? "bg-gradient-to-r from-green-500 to-green-600 text-white"
          : "bg-gradient-to-r from-blue-500 to-blue-600 text-white"
      }`}
    >
      {isCompleted ? (
        <>✓ Completed</>
      ) : (
        <>
          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          Processing
        </>
      )}
    </span>
  );
}

function EnhancedIconOnly({
  children,
  onClick,
  title,
  ariaLabel,
  disabled = false,
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={ariaLabel}
      disabled={disabled}
      className={`inline-flex items-center justify-center w-10 h-10 rounded-xl border transition-all duration-200 ${
        disabled
          ? "border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed"
          : "border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 hover:scale-105 hover:shadow-md active:scale-95"
      } text-lg`}
    >
      {children}
    </button>
  );
}

function EnhancedToolbarBtn({ children, onClick, disabled, title, icon }) {
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={`flex items-center justify-center w-10 h-10 rounded-lg border text-lg transition-all duration-200 ${
        disabled
          ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-60"
          : "bg-white hover:bg-gray-50 text-gray-800 border-gray-200 hover:border-gray-300 hover:shadow-sm active:scale-95 hover:scale-105"
      }`}
    >
      {icon || children}
    </button>
  );
}

function EnhancedSegBtn({ active, onClick, children, divider, title }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`px-4 py-2 text-sm font-medium transition-all duration-200 relative flex items-center gap-2 ${
        active
          ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-sm"
          : "bg-white hover:bg-gray-50 text-gray-700 hover:text-gray-900"
      } ${divider ? "border-l border-gray-200" : ""}`}
    >
      {children}
      {active && (
        <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-blue-600/20 rounded-lg pointer-events-none"></div>
      )}
    </button>
  );
}

function ViewModeButton({ active, onClick, title, icon, divider }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`px-3 py-2 text-sm font-medium transition-all duration-200 ${
        active
          ? "bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-sm"
          : "bg-white hover:bg-gray-50 text-gray-700 hover:text-gray-900"
      } ${divider ? "border-l border-gray-200" : ""}`}
    >
      {icon}
    </button>
  );
}

function EnhancedPane({ title, subtitle, actions, children }) {
  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/50 overflow-hidden transition-all duration-300 hover:shadow-xl h-full flex flex-col min-h-0">
      <div className="bg-gradient-to-r from-gray-50/80 to-white/80 px-5 py-4 border-b border-gray-200/50 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-gray-800 flex items-center text-base truncate">
              {title}
            </h3>
            {subtitle && (
              <p className="text-xs text-gray-500 mt-1 font-medium">
                {subtitle}
              </p>
            )}
          </div>
          {actions && (
            <div className="flex items-center gap-1 ml-4 flex-shrink-0">
              {actions}
            </div>
          )}
        </div>
      </div>
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
}

function StatChip({ icon, label, value }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2 bg-white/90 backdrop-blur-sm rounded-xl border border-white/50 text-sm shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105">
      <span className="text-base flex-shrink-0">{icon}</span>
      <div className="flex flex-col min-w-0">
        <span className="text-gray-800 font-semibold text-sm truncate">
          {value}
        </span>
        <span className="text-gray-500 text-xs font-medium truncate">
          {label}
        </span>
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
  icon,
  disabled = false,
  loading = false,
}) {
  const baseClasses =
    "inline-flex items-center justify-center w-9 h-9 rounded-lg text-sm transition-all duration-200 hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50";

  const variantClasses = {
    copy: "bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 hover:border-blue-300 disabled:hover:bg-blue-50",
    download:
      "bg-green-50 hover:bg-green-100 text-green-600 border border-green-200 hover:border-green-300 disabled:hover:bg-green-50",
    active:
      "bg-purple-50 hover:bg-purple-100 text-purple-600 border border-purple-200 hover:border-purple-300",
    default:
      "bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-200 hover:border-gray-300 disabled:hover:bg-gray-50",
  };

  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={ariaLabel}
      disabled={disabled || loading}
      className={`${baseClasses} ${variantClasses[variant]} hover:shadow-sm`}
    >
      {loading ? (
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
      ) : (
        icon || children
      )}
    </button>
  );
}

function EnhancedToggle({ checked, onChange, label, title }) {
  return (
    <div className="flex items-center gap-2" title={title}>
      <button
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
          checked ? "bg-blue-600" : "bg-gray-200"
        }`}
        role="switch"
        aria-checked={checked}
        aria-label={title}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
            checked ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
      <span className="text-xs font-medium text-gray-600">{label}</span>
    </div>
  );
}

/* Add custom animations and enhanced styles */
const style = document.createElement("style");
style.textContent = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  .animate-fadeIn {
    animation: fadeIn 0.4s ease-out;
  }
  
  @keyframes slideIn {
    from { opacity: 0; transform: translateX(-20px); }
    to { opacity: 1; transform: translateX(0); }
  }
  
  .animate-slideIn {
    animation: slideIn 0.3s ease-out;
  }
  
  /* Enhanced scrollbars */
  .prose::-webkit-scrollbar {
    width: 6px;
  }
  
  .prose::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.05);
    border-radius: 3px;
  }
  
  .prose::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 3px;
  }
  
  .prose::-webkit-scrollbar-thumb:hover {
    background: rgba(0, 0, 0, 0.3);
  }
  
  /* Enhanced prose styling */
  .prose {
    --tw-prose-headings: theme(colors.gray.900);
    --tw-prose-lead: theme(colors.gray.600);
    --tw-prose-links: theme(colors.blue.600);
    --tw-prose-bold: theme(colors.gray.900);
    --tw-prose-counters: theme(colors.gray.500);
    --tw-prose-bullets: theme(colors.gray.300);
    --tw-prose-hr: theme(colors.gray.200);
    --tw-prose-quotes: theme(colors.gray.900);
    --tw-prose-quote-borders: theme(colors.gray.200);
    --tw-prose-captions: theme(colors.gray.500);
    --tw-prose-code: theme(colors.gray.900);
    --tw-prose-pre-code: theme(colors.gray.200);
    --tw-prose-pre-bg: theme(colors.gray.800);
    --tw-prose-th-borders: theme(colors.gray.300);
    --tw-prose-td-borders: theme(colors.gray.200);
  }
  
  .prose table {
    border-collapse: collapse;
    border-spacing: 0;
    width: 100%;
    margin: 1em 0;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  }
  
  .prose th {
    background: linear-gradient(135deg, theme(colors.blue.50), theme(colors.blue.100));
    font-weight: 600;
    text-align: left;
    padding: 12px;
    border-bottom: 2px solid theme(colors.blue.200);
  }
  
  .prose td {
    padding: 12px;
    border-bottom: 1px solid theme(colors.gray.200);
  }
  
  .prose tr:hover {
    background-color: theme(colors.gray.50);
  }
  
  /* Enhanced focus states */
  button:focus-visible {
    outline: 2px solid theme(colors.blue.500);
    outline-offset: 2px;
  }
  
  select:focus-visible {
    outline: 2px solid theme(colors.blue.500);
    outline-offset: 2px;
  }
`;

if (
  !document.head.querySelector(
    'style[data-component="enhanced-results-viewer"]'
  )
) {
  style.setAttribute("data-component", "enhanced-results-viewer");
  document.head.appendChild(style);
}
