// src/components/UniDocParser/FileDropZone.jsx
import React, { useState, useCallback } from "react";

export default function FileDropZone({
  file,
  onFileSelect,
  onBrowseClick,
  maxFileSizeMB,
  disabled,
  isPlaceholder = false,
}) {
  const [dragActive, setDragActive] = useState(false);

  const handleDragOver = useCallback(
    (e) => {
      e.preventDefault();
      if (!disabled) setDragActive(true);
    },
    [disabled]
  );

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setDragActive(false);
  }, []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragActive(false);
      if (disabled) return;

      const droppedFile = e.dataTransfer.files?.[0];
      if (droppedFile) {
        onFileSelect(droppedFile);
      }
    },
    [onFileSelect, disabled]
  );

  const handleClick = useCallback(() => {
    if (!disabled) {
      onBrowseClick();
    }
  }, [onBrowseClick, disabled]);

  // Determine the appropriate styling based on state
  const getContainerStyles = () => {
    if (disabled) {
      return "bg-gray-50 border-gray-200 cursor-not-allowed";
    }

    if (isPlaceholder) {
      return "bg-gradient-to-br from-orange-50 to-amber-50 hover:from-orange-100 hover:to-amber-100 border-orange-300 cursor-pointer";
    }

    if (dragActive) {
      return "bg-gradient-to-br from-blue-100 to-indigo-100 border-blue-400 cursor-pointer";
    }

    return "bg-gradient-to-br from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border-blue-300 cursor-pointer";
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      className={`
        flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-xl transition-all duration-300
        ${getContainerStyles()}
      `}
    >
      <div className="flex flex-col items-center justify-center py-8">
        <div className="mb-4 p-4 bg-white rounded-full shadow">
          <span className="text-3xl">
            {isPlaceholder ? "⚠️" : file ? "📄" : "☁️"}
          </span>
        </div>

        {!file ? (
          <>
            <p className="mb-2 text-lg font-semibold text-gray-700">
              Drop your file here
            </p>
            <p className="text-sm text-gray-500 text-center">
              or <span className="text-blue-600 font-medium">browse files</span>
              <br />
              PDF/Images/Excel up to {maxFileSizeMB}MB
            </p>
          </>
        ) : isPlaceholder ? (
          <>
            <div className="mt-2 px-4 py-2 bg-orange-100 border border-orange-300 rounded-full text-sm text-orange-700 font-medium shadow">
              📄 {file.name} (Session Restored)
            </div>
            <p className="text-xs text-orange-600 mt-2 text-center">
              Click to select the actual file to continue
            </p>
          </>
        ) : (
          <div className="mt-2 px-4 py-2 bg-white rounded-full text-sm text-blue-600 font-medium shadow">
            📄 {file.name}
          </div>
        )}
      </div>
    </div>
  );
}
