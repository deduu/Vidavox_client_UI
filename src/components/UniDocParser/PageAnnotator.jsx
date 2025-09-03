import React, { useEffect, useMemo, useRef, useState } from "react";

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
  authHeaders = {},
}) {
  const wrapperRef = useRef(null);
  const imgRef = useRef(null);
  const objectUrlRef = useRef(null); // track blob URL for cleanup
  const fetchAbortRef = useRef(null); // abort in-flight fetches

  const [natural, setNatural] = useState({ w: 0, h: 0 });
  const [rendered, setRendered] = useState({ w: 0, h: 0 });
  const [imageSrc, setImageSrc] = useState(null);
  const [imageError, setImageError] = useState(false);
  const [loading, setLoading] = useState(false);

  // ALL useMemo calls must be at the top level, before any conditional logic
  const typesSet = useMemo(() => {
    if (!visibleTypes) return null;
    return visibleTypes instanceof Set ? visibleTypes : new Set(visibleTypes);
  }, [visibleTypes]);

  const scale = useMemo(() => {
    if (!natural.w || !natural.h || !rendered.w || !rendered.h) {
      return { x: 1, y: 1 };
    }
    return { x: rendered.w / natural.w, y: rendered.h / natural.h };
  }, [natural, rendered]);

  const filtered = useMemo(() => {
    if (!elements?.length) return [];
    if (!typesSet) return elements;
    return elements.filter((e) => typesSet.has(e.type));
  }, [elements, typesSet]);

  // ALL useEffect calls must be at the top level, before any conditional logic
  // ResizeObserver effect
  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;
    const ro = new ResizeObserver(() => {
      setRendered({ w: img.clientWidth || 0, h: img.clientHeight || 0 });
    });
    ro.observe(img);
    return () => ro.disconnect();
  }, []);

  const authKey = useMemo(
    () => JSON.stringify(authHeaders || {}),
    [authHeaders]
  );
  // Image loading effect
  useEffect(() => {
    // cleanup previous blob URL & fetch
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    if (fetchAbortRef.current) {
      fetchAbortRef.current.abort();
      fetchAbortRef.current = null;
    }

    setImageError(false);
    setImageSrc(null);

    // Prefer base64 if provided
    if (imageBase64) {
      const src = imageBase64.startsWith("data:")
        ? imageBase64
        : `data:image/jpeg;base64,${imageBase64}`;
      setImageSrc(src);
      return;
    }

    if (!imageUrl) {
      return;
    }

    const controller = new AbortController();
    fetchAbortRef.current = controller;

    const load = async () => {
      try {
        setLoading(true);

        // If we have auth headers, fetch as blob; otherwise use direct URL
        if (Object.keys(authHeaders).length > 0) {
          const response = await fetch(imageUrl, {
            headers: {
              ...authHeaders,
              // Do not set Content-Type on GET
              Accept: "image/jpeg,image/png,image/*",
            },
            signal: controller.signal,
          });

          if (!response.ok) {
            throw new Error(
              `Failed to load image: ${response.status} ${response.statusText}`
            );
          }

          const blob = await response.blob();
          const objectUrl = URL.createObjectURL(blob);
          objectUrlRef.current = objectUrl;
          setImageSrc(objectUrl);
        } else {
          setImageSrc(imageUrl);
        }
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error("Error loading image:", err);
          setImageError(true);
          setImageSrc(null);
        }
      } finally {
        setLoading(false);
      }
    };

    load();

    // Cleanup
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
      if (fetchAbortRef.current) {
        fetchAbortRef.current.abort();
        fetchAbortRef.current = null;
      }
    };
  }, [imageUrl, imageBase64, authKey]);

  // Handler functions
  const handleImgLoad = (e) => {
    const img = e.currentTarget;
    const w = img.naturalWidth || 0;
    const h = img.naturalHeight || 0;
    setNatural({ w, h });
    setRendered({ w: img.clientWidth || 0, h: img.clientHeight || 0 });
    onImageLoadNaturalSize?.(w, h);
  };

  // NOW we can do conditional rendering after ALL hooks have been called
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-2">⏳</div>
          <p className="text-gray-600">Loading image...</p>
        </div>
      </div>
    );
  }

  if (imageError) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
        <div className="text-center">
          <div className="text-4xl mb-2">🚫</div>
          <p className="text-gray-600">Failed to load image</p>
          <p className="text-gray-400 text-sm mt-1">
            Check authentication or network connection
          </p>
        </div>
      </div>
    );
  }

  if (!imageSrc) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
        <div className="text-center">
          <div className="text-4xl mb-2">📄</div>
          <p className="text-gray-600">No image available</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={wrapperRef}
      className="relative w-full overflow-auto border border-gray-200/50 rounded-lg bg-gradient-to-br from-gray-100 to-gray-50 h-[60vh]"
    >
      <div className="relative inline-block">
        <img
          ref={imgRef}
          src={imageSrc}
          alt="PDF page"
          className="block select-none max-w-full h-auto"
          draggable={false}
          crossOrigin="anonymous"
          onLoad={handleImgLoad}
          onError={() => setImageError(true)}
        />

        {showBoxes && rendered.w > 0 && rendered.h > 0 && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ width: rendered.w, height: rendered.h }}
          >
            {filtered.map((el) => {
              const [x1 = 0, y1 = 0, x2 = 0, y2 = 0] = el.bbox || [];
              const top =
                yOrigin === "bottom-left"
                  ? (natural.h - y2) * scale.y
                  : y1 * scale.y;
              const left = x1 * scale.x;
              const width = Math.max((x2 - x1) * scale.x, 0);
              const height = Math.max((y2 - y1) * scale.y, 0);

              const colorClass =
                el.type === "table"
                  ? "ring-2 ring-purple-500/70 bg-purple-500/10"
                  : el.type === "image"
                  ? "ring-2 ring-amber-500/70 bg-amber-500/10"
                  : "ring-2 ring-blue-500/70 bg-blue-500/10";

              const isSelected = selectedIdx != null && selectedIdx === el.idx;
              const selectedClass = isSelected
                ? "shadow-[0_0_0_3px_rgba(59,130,246,0.6)]"
                : "";

              return (
                <div
                  key={el.idx}
                  className={`absolute rounded-md ${colorClass} ${selectedClass}`}
                  style={{
                    left,
                    top,
                    width,
                    height,
                    pointerEvents: onSelect ? "auto" : "none",
                  }}
                  title={`${el.type}${
                    el.text ? `: ${el.text.slice(0, 80)}` : ""
                  }`}
                  onClick={
                    onSelect
                      ? (ev) => {
                          ev.stopPropagation();
                          onSelect(el.idx, el);
                        }
                      : undefined
                  }
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
