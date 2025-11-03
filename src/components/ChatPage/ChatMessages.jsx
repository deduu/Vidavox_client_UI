// components/ChatMessages.jsx
import React from "react";
import ChatMessage from "../../components/ChatMessage";
import { useState, useEffect } from "react";

const ChatMessages = ({ history, typing, hasKnowledgeBases }) => {
  const handleCopy = (content) => {
    navigator.clipboard.writeText(content);
  };

  const handleDownload = (msg) => {
    const blob = new Blob([msg.content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "message.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!history.length && !typing) {
    return <EmptyState hasKnowledgeBases={hasKnowledgeBases} />;
  }

  return (
    <div className="space-y-6">
      {history.map((msg, i) => (
        <ChatMessage
          key={i}
          msg={msg}
          onCopy={() => handleCopy(msg.content)}
          onDownload={() => handleDownload(msg)}
        />
      ))}

      {typing && <TypingIndicator />}
    </div>
  );
};

const EmptyState = ({ hasKnowledgeBases }) => (
  <div className="text-center text-gray-500 py-12">
    <div className="text-xl font-medium mb-3">Welcome to Agentic Chat</div>
    <p className="text-sm max-w-md mx-auto">
      {hasKnowledgeBases
        ? "Your knowledge bases are ready. Start asking questions!"
        : "Start typing to begin the conversation or select knowledge bases for enhanced responses."}
    </p>
  </div>
);

const TypingIndicator = () => (
  <div className="text-gray-500 italic flex items-center gap-2 justify-left py-4">
    <div className="flex space-x-1">
      <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
      <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-100"></div>
      <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-200"></div>
    </div>
    Thinking ...
  </div>
);

export default ChatMessages;
