// components/JumpToBottomButton.jsx
import React from "react";
import { ChevronsDown } from "lucide-react";

export default function JumpToBottomButton({
  isAtBottom,
  unreadCount,
  onScrollToBottom,
}) {
  if (isAtBottom) return null;

  return (
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-10 transition-opacity duration-300">
      <button
        onClick={onScrollToBottom}
        className="bg-white border border-gray-200 shadow-md rounded-full px-3 py-2 flex items-center gap-2 hover:bg-gray-50"
        title="Jump to latest"
      >
        <ChevronsDown size={18} />
        {unreadCount > 0 && (
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-600 text-white">
            {unreadCount}
          </span>
        )}
      </button>
    </div>
  );
}
