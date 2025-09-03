import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

/**
 * PageAnnotator — proxy-ready, simplified
 *
 * Assumptions:
 * - Your frontend hits your OWN backend proxy for images, so no per-request auth headers are needed.
 * - If `imageBase64` is provided, it takes precedence over `imageUrl`.
 * - Boxes are drawn based on image-native coordinates [x1, y1, x2, y2].
 * - `yOrigin` controls coordinate origin: "top-left" (DOM-style) or "bottom-left" (PDF-style).
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
}) {
  const wrapperRef = useRef(null);
  const imgRef = useRef(null);

  const [natural, setNatural] = useState({ w: 0, h: 0 });
  const [rendered, setRendered] = useState({ w: 0, h: 0 });
  const [imageSrc, setImageSrc] = useState(null);
  const [imageError, setImageError] = useState(false);
  const [loading, setLoading] = useState(false);

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
    return filtered.map((el) => {
      const [x1 = 0, y1 = 0, x2 = 0, y2 = 0] = el.bbox || [];
      const left = x1 * scale.x;
      const top =
        yOrigin === "bottom-left"
          ? (coordSpace.h - y2) * scale.y
          : y1 * scale.y;
      const width = Math.max((x2 - x1) * scale.x, 0);
      const height = Math.max((y2 - y1) * scale.y, 0);
      return { ...el, left, top, width, height };
    });
  }, [filtered, scale, coordSpace.h, yOrigin]);
  useEffect(() => {
    console.log(
      "[Annotator] natural=",
      natural,
      "coordSpace=",
      coordSpace,
      "rendered=",
      rendered,
      "scale=",
      scale
    );
  }, [natural, coordSpace, rendered, scale]);

  // useEffect(() => {
  //   if (!imageSrc || !natural.w || !rendered.w) return;
  //   console.log(
  //     "[Annotator] natural=",
  //     natural,
  //     "rendered=",
  //     rendered,
  //     "scale=",
  //     scale
  //   );
  //   filtered.slice(0, 5).forEach((el) => {
  //     console.log(`[Annotator] el idx=${el.idx} bbox=${el.bbox}`, {
  //       topCalc:
  //         yOrigin === "bottom-left"
  //           ? (natural.h - el.bbox[3]) * scale.y
  //           : el.bbox[1] * scale.y,
  //       leftCalc: el.bbox[0] * scale.x,
  //       widthCalc: (el.bbox[2] - el.bbox[0]) * scale.x,
  //       heightCalc: (el.bbox[3] - el.bbox[1]) * scale.y,
  //     });
  //   });
  // }, [natural, rendered, scale, filtered, yOrigin, imageSrc]);

  // ---- Image source decision (proxy-friendly) ----
  useEffect(() => {
    setImageError(false);

    if (imageBase64) {
      // data URL (takes precedence)
      const src = imageBase64.startsWith("data:")
        ? imageBase64
        : `data:image/jpeg;base64,${imageBase64}`;
      setImageSrc(src);
      setLoading(true); // wait for onLoad
      return;
    }

    if (imageUrl) {
      setImageSrc(imageUrl); // just let the <img> load it directly (backend proxy handles auth)
      setLoading(true);
      return;
    }

    setImageSrc(null);
    setLoading(false);
  }, [imageUrl, imageBase64]);

  // ---- Measure rendered size on first load & whenever src changes ----
  useLayoutEffect(() => {
    const img = imgRef.current;
    if (!img) return;
    setRendered({ w: img.clientWidth || 0, h: img.clientHeight || 0 });
  }, [imageSrc]);

  // ---- Track resizes smoothly ----
  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;
    let raf = 0;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        setRendered({ w: img.clientWidth || 0, h: img.clientHeight || 0 });
      });
    });
    ro.observe(img);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);

  // ---- Handlers ----
  const handleImgLoad = (e) => {
    const img = e.currentTarget;
    const w = img.naturalWidth || 0;
    const h = img.naturalHeight || 0;
    setNatural({ w, h });
    setRendered({ w: img.clientWidth || 0, h: img.clientHeight || 0 });
    setLoading(false);
    onImageLoadNaturalSize?.(w, h);
  };

  const handleImgError = () => {
    setImageError(true);
    setLoading(false);
  };

  // ---- UI states ----

  if (imageError) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
        <div className="text-center">
          <div className="text-4xl mb-2">🚫</div>
          <p className="text-gray-600">Failed to load image</p>
          <p className="text-gray-400 text-sm mt-1">
            Try refreshing or check your login.
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
          onError={handleImgError}
        />
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="animate-spin text-4xl mb-2">⏳</div>
          </div>
        )}
        {showBoxes && rendered.w > 0 && rendered.h > 0 && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ width: rendered.w, height: rendered.h }}
          >
            {boxes.map((el) => {
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
                    left: el.left,
                    top: el.top,
                    width: el.width,
                    height: el.height,
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
