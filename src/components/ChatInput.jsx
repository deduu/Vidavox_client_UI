import { useRef, useEffect, useMemo, useState } from "react";
import {
  Plus,
  Settings,
  Mic,
  Send,
  Upload,
  HardDrive,
  X,
  FileText,
} from "lucide-react";

export default function ChatInput({
  message,
  setMessage,
  onSend,
  onAttachFiles, // (FileList) => Promise<void> | void
  onPasteImage, // (File) => Promise<void> | void
  disabled,
  attachments, // [{ id, file, meta, progress, uploading, error }]
  onRemoveAttachment, // (id) => void
  autoSendOnAttach = true,
  onSendFileOnly, // (File) => Promise<void> | void
}) {
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);

  // --- Helpers ---
  const resetFileInput = () => {
    const el = fileInputRef.current;
    if (!el) return;
    el.value = "";
  };

  // Auto-resize textarea height
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  }, [message]);

  // Paste handler (images)
  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type?.startsWith?.("image/")) {
        const file = item.getAsFile();
        if (file) {
          onPasteImage?.(file);
          e.preventDefault();
        }
      }
    }
  };

  // Enter to send (respect IME composition), Shift+Enter for newline
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      onSend?.();
    }
  };

  // File chooser result
  const handleFileChange = (e) => {
    const files = e.target.files;
    if (!files?.length) return;

    onAttachFiles?.(files); // parent uploads & updates attachments[]
    setShowUploadDialog(false);
    resetFileInput();

    // only auto-send when exactly one file AND no text
    if (autoSendOnAttach && !message.trim() && files.length === 1) {
      onSendFileOnly?.(files[0]);
    }
  };

  const handleFileUploadClick = () => {
    resetFileInput();
    fileInputRef.current?.click();
  };

  const handleDriveUpload = () => {
    // TODO: integrate picker/drive flow
    console.log("Drive upload clicked");
    setShowUploadDialog(false);
  };

  // Block send if any file is still uploading
  const anyUploading = attachments?.some((a) => a.uploading);
  const canSend =
    !disabled &&
    !anyUploading &&
    (message.trim() ||
      attachments?.some((a) => a.meta?.url && !a.uploading && !a.error));

  // --- Image thumbnail previews ---
  // Use uploaded URL if available; otherwise, create an object URL from local file
  const previews = useMemo(() => {
    const map = new Map();
    for (const a of attachments || []) {
      const type =
        a.meta?.type || a.file?.type || (a.file?.name || "").split(".").pop();
      const isImage =
        typeof type === "string" &&
        (type.startsWith?.("image/") ||
          // basic fallback for unknown mime but img extension
          /\.(png|jpe?g|gif|webp|bmp|tiff|svg)$/i.test(a.file?.name || ""));
      if (!isImage) continue;

      if (a.meta?.url) {
        map.set(a.id, { url: a.meta.url, owned: false });
      } else if (a.file) {
        try {
          const url = URL.createObjectURL(a.file);
          map.set(a.id, { url, owned: true });
        } catch {
          // ignore
        }
      }
    }
    return map;
  }, [attachments]);

  // Revoke any object URLs we created when attachments change/unmount
  useEffect(() => {
    return () => {
      for (const { url, owned } of previews.values()) {
        if (owned) URL.revokeObjectURL(url);
      }
    };
  }, [previews]);

  return (
    <div className="px-4 py-3 relative">
      <div className="flex items-end gap-3 max-w-4xl mx-auto">
        {/* Attach button */}
        <button
          type="button"
          onClick={() => setShowUploadDialog(true)}
          disabled={disabled}
          className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
          title="Attach files"
          aria-label="Attach files"
        >
          <Plus size={20} className="text-gray-600" />
        </button>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          // accept="image/*,.pdf,.txt,.doc,.docx" // <-- uncomment to restrict
          className="hidden"
          onChange={handleFileChange}
          onClick={resetFileInput}
        />

        {/* Main input container */}
        <div className="flex-1 relative">
          <div className="flex flex-col bg-gray-50 rounded-2xl border border-gray-200 focus-within:border-gray-300 focus-within:bg-white transition-colors">
            {/* Attachment list with thumbnails for images */}
            {attachments?.length > 0 && (
              <div className="px-4 pt-2 space-y-2">
                {attachments.map((a) => {
                  const preview = previews.get(a.id);
                  const isImage = Boolean(preview);
                  return (
                    <div
                      key={a.id}
                      className="rounded-md border border-gray-200 bg-white p-2"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          {/* Thumbnail (if image) */}
                          {isImage ? (
                            <div className="w-14 h-14 rounded-md overflow-hidden border border-gray-200 shrink-0 bg-gray-50">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={preview.url}
                                alt={
                                  a.file?.name ||
                                  a.meta?.filename ||
                                  "image preview"
                                }
                                className="w-full h-full object-cover"
                                loading="lazy"
                                draggable={false}
                              />
                            </div>
                          ) : (
                            <div className="w-14 h-14 rounded-md border border-gray-200 bg-gray-50 shrink-0 flex items-center justify-center">
                              <FileText size={18} className="text-gray-500" />
                            </div>
                          )}

                          <div className="min-w-0">
                            <div className="text-sm text-gray-800 truncate">
                              {a.file?.name || a.meta?.filename || "file"}
                            </div>
                            <div className="text-xs text-gray-500">
                              {(a.file?.type ||
                                a.meta?.type ||
                                "application/octet-stream") +
                                (a.file?.size
                                  ? ` • ${(a.file.size / 1024 / 1024).toFixed(
                                      2
                                    )} MB`
                                  : "")}
                            </div>

                            {/* Progress / Errors / Ready */}
                            {a.uploading && (
                              <div className="mt-2">
                                <div className="w-full h-2 bg-gray-200 rounded">
                                  <div
                                    className="h-2 bg-blue-500 rounded"
                                    style={{ width: `${a.progress || 0}%` }}
                                  />
                                </div>
                                <div className="mt-1 text-xs text-gray-500">
                                  {a.progress || 0}%
                                </div>
                              </div>
                            )}

                            {a.error && (
                              <div className="mt-2 text-xs text-red-600">
                                Upload failed: {a.error}
                              </div>
                            )}

                            {!a.uploading && !a.error && a.meta?.url && (
                              <div className="mt-2 text-xs text-green-700">
                                Ready
                              </div>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => onRemoveAttachment?.(a.id)}
                          className="p-1 rounded hover:bg-gray-100"
                          title="Remove file"
                          aria-label="Remove file"
                        >
                          <X size={14} className="text-gray-500" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Text area + action buttons */}
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
                aria-label="Message input"
              />

              <div className="flex items-center gap-2 px-3 py-2">
                <button
                  type="button"
                  className="p-1.5 rounded-full hover:bg-gray-200 transition-colors"
                  title="Tools"
                  aria-label="Tools"
                >
                  <Settings size={16} className="text-gray-600" />
                </button>

                <button
                  type="button"
                  className="p-1.5 rounded-full hover:bg-gray-200 transition-colors"
                  title="Voice input"
                  aria-label="Voice input"
                >
                  <Mic size={16} className="text-gray-600" />
                </button>

                <button
                  type="button"
                  onClick={onSend}
                  disabled={!canSend}
                  className="p-1.5 rounded-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Send message"
                  aria-label="Send message"
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
                type="button"
                onClick={() => setShowUploadDialog(false)}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
                aria-label="Close upload dialog"
              >
                <X size={14} className="text-gray-500" />
              </button>
            </div>

            <div className="py-1">
              <button
                type="button"
                onClick={handleFileUploadClick}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Upload size={16} className="text-gray-500" />
                Upload from computer
              </button>

              <button
                type="button"
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

      {/* Disclaimer */}
      <div className="text-center mt-3 text-xs text-gray-500 max-w-4xl mx-auto">
        Agentic AI can make mistakes. Check important info.{" "}
        <button type="button" className="underline hover:text-gray-700">
          See Cookie Preferences
        </button>
      </div>

      {/* Backdrop */}
      {showUploadDialog && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowUploadDialog(false)}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
