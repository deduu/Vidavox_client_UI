// src/components/UniDocParser/PageAnnotator.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * Props:
 * - imageBase64: string (base64 or full data URL)
 * - elements: [{ idx, type, bbox:[x1,y1,x2,y2], text? }, ...]
 * - showBoxes: boolean
 * - visibleTypes: Set<string> | string[] (optional)
 * - yOrigin: "top-left" | "bottom-left"  (default "top-left")
 * - onSelect(idx, el): optional
 * - selectedIdx: number | null
 *
 * Notes:
 * - Uses the image's *actual rendered* client size to compute scale.
 * - Overlay uses the same width/height as the rendered image.
 */
export default function PageAnnotator({
  imageBase64,
  elements = [],
  showBoxes = true,
  visibleTypes,
  yOrigin = "top-left",
  onSelect,
  selectedIdx = null,
}) {
  const wrapperRef = useRef(null);
  const imgRef = useRef(null);

  const [natural, setNatural] = useState({ w: 0, h: 0 });
  const [rendered, setRendered] = useState({ w: 0, h: 0 });

  const typesSet = useMemo(() => {
    if (!visibleTypes) return null;
    return visibleTypes instanceof Set ? visibleTypes : new Set(visibleTypes);
  }, [visibleTypes]);

  const src = useMemo(() => {
    if (!imageBase64) return "";
    if (imageBase64.startsWith("data:")) return imageBase64;
    return `data:image/jpeg;base64,${imageBase64}`;
  }, [imageBase64]);

  // Get natural size once
  const handleImgLoad = (e) => {
    const img = e.currentTarget;
    setNatural({ w: img.naturalWidth || 0, h: img.naturalHeight || 0 });
    setRendered({ w: img.clientWidth || 0, h: img.clientHeight || 0 });
  };

  // Track the *rendered* image size (reacts to container resize, zoom, CSS changes)
  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;
    const ro = new ResizeObserver(() => {
      setRendered({ w: img.clientWidth || 0, h: img.clientHeight || 0 });
    });
    ro.observe(img);
    return () => ro.disconnect();
  }, []);

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

  return (
    <div
      ref={wrapperRef}
      className="relative w-full overflow-auto border border-gray-200/50 rounded-lg bg-gradient-to-br from-gray-100 to-gray-50 h-[60vh]"
    >
      {/* The image defines the overlay footprint */}
      <div className="relative inline-block">
        <img
          ref={imgRef}
          src={src}
          alt="PDF page"
          className="block select-none max-w-full h-auto"
          draggable={false}
          onLoad={handleImgLoad}
        />

        {/* Overlay sized exactly like the rendered image */}
        {showBoxes && rendered.w > 0 && rendered.h > 0 && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ width: rendered.w, height: rendered.h }}
          >
            {filtered.map((el) => {
              const [x1, y1, x2, y2] = el.bbox || [0, 0, 0, 0];

              // Convert bbox to top-left origin for CSS positioning if needed
              const topTL =
                yOrigin === "bottom-left"
                  ? (natural.h - y2) * scale.y // invert Y
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
                    top: topTL,
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
