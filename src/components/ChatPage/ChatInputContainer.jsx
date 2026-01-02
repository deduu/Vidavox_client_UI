// components/ChatInputContainer.jsx
import React, { forwardRef } from "react";
import ChatInput from "../../components/ChatInput";

const ChatInputContainer = forwardRef(function ChatInputContainer(
  {
    message,
    setMessage,
    onSend,
    onStop,
    disabled,
    onAttachFiles,
    attachments,
    onRemoveAttachment,
    onSendFileOnly,
    onPasteImage,
  },
  ref
) {
  return (
    <div
      ref={ref}
      className="flex-shrink-0 bg-gradient-to-t from-white via-white to-white/80 pt-4 pb-6"
    >
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-2xl border border-gray-200/50 overflow-visible">
          <ChatInput
            message={message}
            setMessage={setMessage}
            onSend={onSend}
            onStop={onStop}
            disabled={disabled}
            onAttachFiles={onAttachFiles}
            attachments={attachments}
            onRemoveAttachment={onRemoveAttachment}
            onSendFileOnly={onSendFileOnly}
            onPasteImage={onPasteImage}
            autoSendOnAttach
          />
        </div>
      </div>
    </div>
  );
});

export default ChatInputContainer;
