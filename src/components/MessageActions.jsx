import {
  Copy,
  ThumbsUp,
  ThumbsDown,
  Volume2,
  Share,
  RefreshCcw,
} from "lucide-react";

export default function MessageActions({
  onCopy,
  onUpvote,
  onDownvote,
  onSpeak,
  onShare,
  onRetry,
}) {
  return (
    <div className="flex items-center gap-3 text-gray-400 mt-2 text-sm">
      <button title="Copy" onClick={onCopy} className="hover:text-blue-500">
        <Copy size={16} />
      </button>
      <button
        title="Thumbs Up"
        onClick={onUpvote}
        className="hover:text-green-500"
      >
        <ThumbsUp size={16} />
      </button>
      <button
        title="Thumbs Down"
        onClick={onDownvote}
        className="hover:text-red-500"
      >
        <ThumbsDown size={16} />
      </button>
      <button title="Speak" onClick={onSpeak} className="hover:text-purple-500">
        <Volume2 size={16} />
      </button>
      <button title="Share" onClick={onShare} className="hover:text-yellow-500">
        <Share size={16} />
      </button>
      <button title="Retry" onClick={onRetry} className="hover:text-gray-600">
        <RefreshCcw size={16} />
      </button>
    </div>
  );
}
