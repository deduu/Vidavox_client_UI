import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";

/**
 * Enhanced PageAnnotator — responsive, smooth, and beautiful
 *
 * Key improvements:
 * - Better window resize handling with debouncing
 * - Smoother annotation recalculation
 * - Enhanced visual feedback and loading states
 * - Improved responsive behavior
 * - Better error handling and retry mechanisms
 */
export default function PageAnnotator({
  imageUrl,
  imageBase64,
  elements = [],
  showBoxes = true,
  visibleTypes,
  yOrigin = "top-left",
  onSelect,
  selectedIdx = null,
  onImageLoadNaturalSize,
  coordWidth,
  coordHeight,
  appliedZoom = 1,
}) {
  const wrapperRef = useRef(null);
  const imgRef = useRef(null);
  const resizeObserverRef = useRef(null);
  const rafRef = useRef(null);

  const [natural, setNatural] = useState({ w: 0, h: 0 });
  const [rendered, setRendered] = useState({ w: 0, h: 0 });
  const [imageSrc, setImageSrc] = useState(null);
  const [imageError, setImageError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Enhanced state for better UX
  const [isImageReady, setIsImageReady] = useState(false);
  const [hoveredElement, setHoveredElement] = useState(null);

  // ---- Derivations ----
  const typesSet = useMemo(() => {
    if (!visibleTypes) return null;
    return visibleTypes instanceof Set ? visibleTypes : new Set(visibleTypes);
  }, [visibleTypes]);

  const filtered = useMemo(() => {
    if (!elements?.length) return [];
    if (!typesSet) return elements;
    return elements.filter((e) => typesSet.has(e.type));
  }, [elements, typesSet]);

  // derive bbox coordinate space (fallback to natural)
  const coordSpace = useMemo(() => {
    let w = Number(coordWidth) || 0;
    let h = Number(coordHeight) || 0;
    if ((!w || !h) && filtered.length) {
      let maxX = 0,
        maxY = 0;
      for (const el of filtered) {
        const [, , x2 = 0, y2 = 0] = el.bbox || [];
        if (x2 > maxX) maxX = x2;
        if (y2 > maxY) maxY = y2;
      }
      w = w || maxX;
      h = h || maxY;
    }
    if (!w || !h) {
      w = natural.w;
      h = natural.h;
    }
    return { w, h };
  }, [coordWidth, coordHeight, natural, filtered]);

  const scale = useMemo(() => {
    if (!coordSpace.w || !coordSpace.h || !rendered.w || !rendered.h) {
      return { x: 1, y: 1 };
    }
    return {
      x: rendered.w / coordSpace.w,
      y: rendered.h / coordSpace.h,
    };
  }, [coordSpace, rendered]);

  const boxes = useMemo(() => {
    return filtered.map((el, index) => {
      const [x1 = 0, y1 = 0, x2 = 0, y2 = 0] = el.bbox || [];
      const left = x1 * scale.x;
      const top =
        yOrigin === "bottom-left"
          ? (coordSpace.h - y2) * scale.y
          : y1 * scale.y;
      const width = Math.max((x2 - x1) * scale.x, 0);
      const height = Math.max((y2 - y1) * scale.y, 0);
      return { ...el, left, top, width, height, index };
    });
  }, [filtered, scale, coordSpace.h, yOrigin]);

  // Enhanced debounced update function
  const updateRenderedSize = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }

    rafRef.current = requestAnimationFrame(() => {
      const img = imgRef.current;
      if (!img) return;

      const newWidth = img.clientWidth || 0;
      const newHeight = img.clientHeight || 0;

      setRendered((prev) => {
        if (prev.w !== newWidth || prev.h !== newHeight) {
          return { w: newWidth, h: newHeight };
        }
        return prev;
      });
    });
  }, []);
  // PageAnnotator.jsx
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    let to;
    const ro = new ResizeObserver(() => {
      clearTimeout(to);
      to = setTimeout(updateRenderedSize, 50);
    });
    ro.observe(wrapper);

    return () => {
      clearTimeout(to);
      ro.disconnect();
    };
  }, [updateRenderedSize]);
  // Enhanced resize handling with proper cleanup
  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;

    // Create ResizeObserver with debouncing
    let timeoutId;
    const debouncedUpdate = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(updateRenderedSize, 50);
    };

    if (resizeObserverRef.current) {
      resizeObserverRef.current.disconnect();
    }

    resizeObserverRef.current = new ResizeObserver(debouncedUpdate);
    resizeObserverRef.current.observe(img);

    // Initial update
    updateRenderedSize();

    // Handle window resize events
    window.addEventListener("resize", debouncedUpdate);

    // Handle fullscreen changes
    const handleFullscreenChange = () => {
      setTimeout(debouncedUpdate, 100);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("mozfullscreenchange", handleFullscreenChange);
    document.addEventListener("MSFullscreenChange", handleFullscreenChange);

    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      clearTimeout(timeoutId);
      window.removeEventListener("resize", debouncedUpdate);
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
    };
  }, [updateRenderedSize]);

  // Update rendered size when appliedZoom changes
  useEffect(() => {
    if (isImageReady) {
      updateRenderedSize();
    }
  }, [appliedZoom, updateRenderedSize, isImageReady]);

  // Enhanced logging for debugging
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.log("[Enhanced Annotator] State:", {
        natural,
        coordSpace,
        rendered,
        scale,
        appliedZoom,
        elementsCount: filtered.length,
        isImageReady,
      });
    }
  }, [
    natural,
    coordSpace,
    rendered,
    scale,
    appliedZoom,
    filtered.length,
    isImageReady,
  ]);

  // ---- Image source decision with retry logic ----
  useEffect(() => {
    setImageError(false);
    setRetryCount(0);
    setIsImageReady(false);

    if (imageBase64) {
      // data URL (takes precedence)
      const src = imageBase64.startsWith("data:")
        ? imageBase64
        : `data:image/jpeg;base64,${imageBase64}`;
      setImageSrc(src);
      setLoading(true);
      return;
    }

    if (imageUrl) {
      setImageSrc(imageUrl);
      setLoading(true);
      return;
    }

    setImageSrc(null);
    setLoading(false);
  }, [imageUrl, imageBase64]);

  // ---- Enhanced handlers ----
  const handleImgLoad = useCallback(
    (e) => {
      const img = e.currentTarget;
      const w = img.naturalWidth || 0;
      const h = img.naturalHeight || 0;

      setNatural({ w, h });
      setLoading(false);
      setIsImageReady(true);
      setImageError(false);
      setRetryCount(0);

      // Initial rendered size update
      updateRenderedSize();

      onImageLoadNaturalSize?.(w, h);
    },
    [updateRenderedSize, onImageLoadNaturalSize]
  );

  const handleImgError = useCallback(() => {
    setImageError(true);
    setLoading(false);
    setIsImageReady(false);

    if (process.env.NODE_ENV === "development") {
      console.error("[Enhanced Annotator] Image load error:", imageSrc);
    }
  }, [imageSrc]);

  const handleRetry = useCallback(() => {
    if (retryCount < 3) {
      setRetryCount((prev) => prev + 1);
      setImageError(false);
      setLoading(true);

      // Force reload by adding timestamp
      if (imageSrc) {
        const separator = imageSrc.includes("?") ? "&" : "?";
        setImageSrc(`${imageSrc}${separator}retry=${Date.now()}`);
      }
    }
  }, [retryCount, imageSrc]);

  const handleElementHover = useCallback((element, isHovering) => {
    setHoveredElement(isHovering ? element : null);
  }, []);

  const handleElementClick = useCallback(
    (element) => {
      if (onSelect) {
        onSelect(element.idx, element);
      }
    },
    [onSelect]
  );

  // ---- Enhanced UI states ----
  if (imageError) {
    return (
      <div className="flex items-center justify-center h-64 bg-gradient-to-br from-red-50 to-red-100 rounded-lg border-2 border-red-200">
        <div className="text-center p-6">
          <div className="text-5xl mb-4 animate-bounce">🚫</div>
          <h3 className="text-lg font-semibold text-red-700 mb-2">
            Failed to load image
          </h3>
          <p className="text-red-600 text-sm mb-4 max-w-sm">
            The image could not be loaded. This might be due to network issues
            or authentication problems.
          </p>
          <div className="flex flex-col gap-2 items-center">
            <button
              onClick={handleRetry}
              disabled={retryCount >= 3}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
                retryCount >= 3
                  ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                  : "bg-red-500 hover:bg-red-600 text-white hover:scale-105 active:scale-95 shadow-md"
              }`}
            >
              {retryCount >= 3
                ? "Max retries reached"
                : `Retry (${retryCount}/3)`}
            </button>
            <p className="text-red-400 text-xs">
              Try refreshing the page or check your connection
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!imageSrc) {
    return (
      <div className="flex items-center justify-center h-64 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg border-2 border-dashed border-gray-300">
        <div className="text-center p-6">
          <div className="text-5xl mb-4 opacity-60">📄</div>
          <h3 className="text-lg font-semibold text-gray-600 mb-2">
            No image available
          </h3>
          <p className="text-gray-500 text-sm">
            Upload a document to see the original page with annotations
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={wrapperRef}
      className="relative w-full border border-gray-200/50 rounded-lg bg-gradient-to-br from-gray-100 to-gray-50 h-full shadow-inner"
    >
      <div className="relative inline-block min-w-full">
        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 bg-white/80 backdrop-blur-sm">
            <div className="text-center">
              <div className="relative">
                <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin mb-4"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-4 h-4 bg-blue-500 rounded-full animate-pulse"></div>
                </div>
              </div>
              <p className="text-sm font-medium text-gray-600">
                Loading image...
              </p>
            </div>
          </div>
        )}

        <img
          ref={imgRef}
          src={imageSrc}
          alt="PDF page"
          className={`block select-none max-w-full h-auto transition-all duration-300 ${
            loading ? "opacity-50" : "opacity-100"
          } ${isImageReady ? "animate-fadeIn" : ""}`}
          draggable={false}
          crossOrigin="anonymous"
          onLoad={handleImgLoad}
          onError={handleImgError}
          style={{
            filter: loading ? "blur(1px)" : "none",
          }}
        />

        {/* Enhanced annotation overlay */}
        {showBoxes && isImageReady && rendered.w > 0 && rendered.h > 0 && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ width: rendered.w, height: rendered.h }}
          >
            {boxes.map((el) => {
              const isSelected = selectedIdx != null && selectedIdx === el.idx;
              const isHovered = hoveredElement?.idx === el.idx;

              const getElementStyles = (type) => {
                const baseStyles =
                  "absolute rounded-md transition-all duration-200 border-2";

                switch (type) {
                  case "table":
                    return `${baseStyles} border-purple-500 bg-gradient-to-br from-purple-500/10 to-purple-600/15 shadow-purple-500/20`;
                  case "image":
                    return `${baseStyles} border-amber-500 bg-gradient-to-br from-amber-500/10 to-amber-600/15 shadow-amber-500/20`;
                  default:
                    return `${baseStyles} border-blue-500 bg-gradient-to-br from-blue-500/10 to-blue-600/15 shadow-blue-500/20`;
                }
              };

              const selectedClass = isSelected
                ? "shadow-[0_0_0_3px_rgba(59,130,246,0.6)] scale-105 z-20"
                : "";

              const hoveredClass =
                isHovered && !isSelected ? "shadow-lg scale-102 z-10" : "";

              const interactiveClass = onSelect
                ? "cursor-pointer hover:shadow-lg hover:scale-102"
                : "";

              return (
                <div
                  key={`${el.idx}-${el.index}`}
                  className={`${getElementStyles(
                    el.type
                  )} ${selectedClass} ${hoveredClass} ${interactiveClass} shadow-lg`}
                  style={{
                    left: el.left,
                    top: el.top,
                    width: el.width,
                    height: el.height,
                    pointerEvents: onSelect ? "auto" : "none",
                  }}
                  title={`${el.type}${
                    el.text ? `: ${el.text.slice(0, 120)}...` : ""
                  }`}
                  onClick={
                    onSelect
                      ? (ev) => {
                          ev.stopPropagation();
                          handleElementClick(el);
                        }
                      : undefined
                  }
                  onMouseEnter={
                    onSelect ? () => handleElementHover(el, true) : undefined
                  }
                  onMouseLeave={
                    onSelect ? () => handleElementHover(el, false) : undefined
                  }
                >
                  {/* Type indicator */}
                  <div
                    className={`absolute -top-2 -left-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow-md transition-all duration-200 ${
                      el.type === "table"
                        ? "bg-purple-500 text-white"
                        : el.type === "image"
                        ? "bg-amber-500 text-white"
                        : "bg-blue-500 text-white"
                    } ${isSelected || isHovered ? "scale-110" : ""}`}
                  >
                    {el.type === "table"
                      ? "T"
                      : el.type === "image"
                      ? "I"
                      : "A"}
                  </div>

                  {/* Hover tooltip */}
                  {isHovered && el.text && (
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg z-30 max-w-xs animate-fadeIn">
                      <div className="font-semibold mb-1 capitalize">
                        {el.type}
                      </div>
                      <div className="line-clamp-3">
                        {el.text.slice(0, 200)}
                      </div>
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Element count indicator */}
        {/* {showBoxes && boxes.length > 0 && isImageReady && (
          <div className="absolute top-4 right-4 px-3 py-2 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 z-20">
            <div className="flex items-center gap-2 text-sm">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="font-medium">
                  {boxes.filter((b) => b.type === "text").length}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                <span className="font-medium">
                  {boxes.filter((b) => b.type === "table").length}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                <span className="font-medium">
                  {boxes.filter((b) => b.type === "image").length}
                </span>
              </div>
            </div>
            <div className="text-xs text-gray-500 mt-1 text-center">
              {boxes.length} elements
            </div>
          </div>
        )} */}
      </div>
    </div>
  );
}

/* Enhanced styles */
const enhancedStyles = document.createElement("style");
enhancedStyles.textContent = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  .animate-fadeIn {
    animation: fadeIn 0.4s ease-out;
  }
  
  .scale-102 {
    transform: scale(1.02);
  }
  
  .line-clamp-3 {
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  
  /* Enhanced scrollbars for the annotator */
  .overflow-auto::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }
  
  .overflow-auto::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.05);
    border-radius: 4px;
  }
  
  .overflow-auto::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 4px;
    border: 1px solid rgba(255, 255, 255, 0.3);
  }
  
  .overflow-auto::-webkit-scrollbar-thumb:hover {
    background: rgba(0, 0, 0, 0.3);
  }
  
  .overflow-auto::-webkit-scrollbar-corner {
    background: rgba(0, 0, 0, 0.05);
  }
`;

if (
  !document.head.querySelector(
    'style[data-component="enhanced-page-annotator"]'
  )
) {
  enhancedStyles.setAttribute("data-component", "enhanced-page-annotator");
  document.head.appendChild(enhancedStyles);
}
