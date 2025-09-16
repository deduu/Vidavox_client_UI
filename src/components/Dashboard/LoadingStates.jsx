// src/components/dashboard/LoadingStates.jsx
import React from "react";
import { Loader2 } from "lucide-react";

export const LoadingSpinner = ({ size = "md", className = "" }) => {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
    xl: "w-12 h-12",
  };

  return (
    <Loader2 className={`animate-spin ${sizeClasses[size]} ${className}`} />
  );
};

export const LoadingCard = ({ title = "Loading...", description = "" }) => (
  <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 border border-white/60 shadow-lg">
    <div className="flex items-center justify-center space-x-4">
      <LoadingSpinner size="lg" className="text-blue-600" />
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {description && (
          <p className="text-sm text-gray-500 mt-1">{description}</p>
        )}
      </div>
    </div>
  </div>
);

export const ErrorState = ({ title, description, onRetry }) => (
  <div className="text-center py-16">
    <div className="mx-auto w-24 h-24 bg-gradient-to-br from-red-100 to-red-200 rounded-3xl flex items-center justify-center mb-6 shadow-lg">
      <svg
        className="w-12 h-12 text-red-500"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
        />
      </svg>
    </div>
    <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
    <p className="text-gray-500 max-w-md mx-auto leading-relaxed mb-6">
      {description}
    </p>
    {onRetry && (
      <button
        onClick={onRetry}
        className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-sm font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
      >
        Try Again
      </button>
    )}
  </div>
);
