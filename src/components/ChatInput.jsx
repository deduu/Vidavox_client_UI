import { useRef, useEffect, useState } from "react";
import {
  Plus,
  Settings,
  Mic,
  Send,
  Upload,
  HardDrive,
  X,
  FileText,
} from "lucide-react"; // Import FileText icon

export default function ChatInput({
  message,
  setMessage,
  onSend,
  onAttachFile, // This prop will now directly receive the File object
  onPasteImage,
  disabled,
  attachedFile, // New prop to receive the attached file from parent
  onRemoveAttachedFile, // New prop to signal removal of attached file
}) {
  const fileInputRef = useRef();
  const textareaRef = useRef();
  const [showUploadDialog, setShowUploadDialog] = useState(false);

  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let item of items) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        onPasteImage(file);
        e.preventDefault();
      }
    }
  };

  // Auto-resize textarea height based on content
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto"; // reset
      el.style.height = Math.min(el.scrollHeight, 160) + "px"; // grow to fit, max 160px
    }
  }, [message]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      onAttachFile?.(e.target.files[0]); // Pass the File object directly
    }
    setShowUploadDialog(false);
  };

  const handleFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleDriveUpload = () => {
    // Placeholder for drive upload functionality
    console.log("Drive upload clicked");
    setShowUploadDialog(false);
  };

  return (
    <div className="px-4 py-3 relative">
      <div className="flex items-end gap-3 max-w-4xl mx-auto">
        {/* Plus button */}
        <button
          onClick={() => setShowUploadDialog(true)}
          disabled={disabled}
          className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
          title="Attach file"
        >
          <Plus size={20} className="text-gray-600" />
        </button>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Main input container */}
        <div className="flex-1 relative">
          <div className="flex flex-col bg-gray-50 rounded-2xl border border-gray-200 focus-within:border-gray-300 focus-within:bg-white transition-colors">
            {attachedFile && (
              <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-white rounded-t-2xl">
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <FileText size={16} className="text-gray-500" />
                  <span>{attachedFile.name}</span>
                </div>
                <button
                  onClick={onRemoveAttachedFile}
                  className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                  title="Remove file"
                >
                  <X size={14} className="text-gray-500" />
                </button>
              </div>
            )}
            <div className="flex items-end">
              <textarea
                ref={textareaRef}
                className="flex-1 bg-transparent px-4 py-3 text-gray-900 placeholder-gray-500 resize-none border-none outline-none"
                rows={1}
                placeholder="Ask anything"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                disabled={disabled}
                style={{
                  maxHeight: "160px",
                  overflowY: "auto",
                  minHeight: "24px",
                }}
              />

              {/* Right side buttons */}
              <div className="flex items-center gap-2 px-3 py-2">
                {/* Settings/Tools button */}
                <button
                  className="p-1.5 rounded-full hover:bg-gray-200 transition-colors"
                  title="Tools"
                >
                  <Settings size={16} className="text-gray-600" />
                </button>

                {/* Microphone button */}
                <button
                  className="p-1.5 rounded-full hover:bg-gray-200 transition-colors"
                  title="Voice input"
                >
                  <Mic size={16} className="text-gray-600" />
                </button>

                {/* Send button */}
                <button
                  onClick={onSend}
                  disabled={disabled || (!message.trim() && !attachedFile)} // Disable send if no message or file
                  className="p-1.5 rounded-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Send message"
                >
                  <Send size={16} className="text-white" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Dialog */}
      {showUploadDialog && (
        <div className="absolute bottom-full left-4 mb-2 z-10">
          <div className="bg-white rounded-lg shadow-lg border border-gray-200 py-2 min-w-48">
            <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100">
              <h3 className="text-sm font-medium text-gray-900">
                Upload a file
              </h3>
              <button
                onClick={() => setShowUploadDialog(false)}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                <X size={14} className="text-gray-500" />
              </button>
            </div>

            <div className="py-1">
              <button
                onClick={handleFileUpload}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Upload size={16} className="text-gray-500" />
                Upload from computer
              </button>

              <button
                onClick={handleDriveUpload}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <HardDrive size={16} className="text-gray-500" />
                Upload from drive
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Disclaimer text */}
      <div className="text-center mt-3 text-xs text-gray-500 max-w-4xl mx-auto">
        Agentic AI can make mistakes. Check important info.{" "}
        <button className="underline hover:text-gray-700">
          See Cookie Preferences
        </button>
      </div>

      {/* Backdrop to close dialog */}
      {showUploadDialog && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowUploadDialog(false)}
        />
      )}
    </div>
  );
}
