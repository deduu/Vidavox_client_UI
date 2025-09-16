// src/components/dashboard/NotificationSystem.jsx
import React from "react";
import { CheckCircle, AlertTriangle, X } from "lucide-react";

export const NotificationSystem = ({ notification, onClose }) => {
  if (!notification.visible) return null;

  const getNotificationStyles = (type) => {
    switch (type) {
      case "success":
        return "bg-emerald-500/90 text-white border-emerald-400";
      case "error":
        return "bg-red-500/90 text-white border-red-400";
      case "warning":
        return "bg-amber-500/90 text-white border-amber-400";
      default:
        return "bg-blue-500/90 text-white border-blue-400";
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case "success":
        return <CheckCircle className="w-5 h-5 flex-shrink-0" />;
      case "error":
      case "warning":
        return <AlertTriangle className="w-5 h-5 flex-shrink-0" />;
      default:
        return <CheckCircle className="w-5 h-5 flex-shrink-0" />;
    }
  };

  return (
    <div className="fixed top-6 right-6 z-50 max-w-md">
      <div
        className={`transform transition-all duration-500 ${
          notification.visible
            ? "translate-x-0 opacity-100 scale-100"
            : "translate-x-full opacity-0 scale-95"
        }`}
      >
        <div
          className={`flex items-center gap-3 px-5 py-4 rounded-xl shadow-2xl backdrop-blur-sm border-2 ${getNotificationStyles(
            notification.type
          )}`}
        >
          {getIcon(notification.type)}
          <span className="text-sm font-medium flex-1">
            {notification.message}
          </span>
          {onClose && (
            <button
              onClick={onClose}
              className="ml-2 p-1 hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
