import { useRef } from "react";

export default function ChatInput({
  message,
  setMessage,
  onSend,
  onAttachFile,
  onPasteImage,
  disabled,
}) {
  const fileInputRef = useRef();

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

  return (
    <div className="p-4 bg-white border-t flex items-center space-x-2">
      <button onClick={() => fileInputRef.current.click()} title="Attach file">
        📎
      </button>
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={(e) => onAttachFile(e.target.files[0])}
      />

      <textarea
        className="flex-1 border rounded p-2 resize-none"
        rows={1}
        placeholder="Type a message…"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            onSend();
          }
        }}
        onPaste={handlePaste}
        disabled={disabled}
      />

      <button
        onClick={onSend}
        disabled={disabled || !message.trim()}
        className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
      >
        Send
      </button>
    </div>
  );
}
