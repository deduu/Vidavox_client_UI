export default function SmartImage({
  base64,
  url,
  alt = "page",
  className = "",
  onLoadNaturalSize, // (w,h) => void
}) {
  const src = base64 ? `data:image/jpeg;base64,${base64}` : url;

  return (
    <img
      src={src}
      alt={alt}
      draggable={false}
      crossOrigin="anonymous" // keep canvas untainted if you draw overlays
      className={`block w-full h-auto select-none ${className}`}
      onLoad={(e) => {
        const img = e.currentTarget;
        onLoadNaturalSize?.(img.naturalWidth || 0, img.naturalHeight || 0);
      }}
    />
  );
}
