// src/components/UniDocParser/ProgressIndicator.jsx
import React from "react";

export default function ProgressIndicator({
  percentage,
  label = "Processing...",
  subtitle = "",
}) {
  // Ensure percentage is within bounds
  const normalizedPercentage = Math.max(0, Math.min(100, percentage || 0));

  return (
    <div className="w-full space-y-3">
      {/* Label and Percentage */}
      <div className="flex justify-between items-center">
        <div className="flex flex-col">
          <span className="text-sm font-medium text-gray-700">{label}</span>
          {subtitle && (
            <span className="text-xs text-gray-500 mt-1">{subtitle}</span>
          )}
        </div>
        <span className="text-sm font-semibold text-gray-600">
          {Math.round(normalizedPercentage)}%
        </span>
      </div>

      {/* Progress Bar */}
      <div className="relative">
        <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
          <div
            className="bg-gradient-to-r from-blue-500 to-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out relative"
            style={{ width: `${normalizedPercentage}%` }}
          >
            {/* Animated shine effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse" />
          </div>
        </div>
      </div>

      {/* Pulsing dots for active processing */}
      <div className="flex justify-center space-x-1">
        <div
          className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"
          style={{ animationDelay: "0ms" }}
        />
        <div
          className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"
          style={{ animationDelay: "150ms" }}
        />
        <div
          className="w-2 h-2 bg-blue-300 rounded-full animate-pulse"
          style={{ animationDelay: "300ms" }}
        />
      </div>
    </div>
  );
}
