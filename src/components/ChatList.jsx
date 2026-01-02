import React, { useState } from "react";

export default function ChatList({
  chats,
  currentId,
  onSelect,
  onDelete,
  onRename,
  onCreate,
}) {
  const [editingChatId, setEditingChatId] = useState(null);

  const handleRenameBlur = (chatId, newTitle) => {
    if (
      newTitle.trim() !== "" &&
      newTitle !== chats.find((c) => c.id === chatId)?.title
    ) {
      onRename(chatId, newTitle);
    }
    setEditingChatId(null);
  };

  const handleTitleClick = (chatId) => {
    onSelect(chatId);
    setEditingChatId(null);
  };

  const handleRenameClick = (chatId, e) => {
    e.stopPropagation();
    setEditingChatId(chatId);
  };

  return (
    <div className="w-full bg-white p-0 space-y-2 overflow-x-hidden">
      {/* <h2 className="font-bold text-xl mb-4">💬 My Chats</h2> */}
      <button
        onClick={onCreate}
        className="mb-2 px-3 py-2 text-sm text-blue-600 bg-blue-50 hover:bg-blue-100 rounded w-full text-left"
      >
        ➕ New Chat
      </button>
      {chats.length === 0 && (
        <p className="text-base text-gray-500">No chats yet.</p>
      )}
      {chats.map((chat) => (
        <div
          key={chat.id}
          className={`group flex items-center justify-between rounded-lg hover:bg-gray-100 px-3 py-3 min-h-[60px] h-[60px] ${
            chat.id === currentId ? "bg-blue-100 font-semibold" : ""
          }`}
        >
          <div className="flex-1 text-left text-base min-w-0 pr-2 h-full flex items-center">
            {editingChatId === chat.id ? (
              <input
                type="text"
                className="w-full text-sm px-2 py-1 border rounded"
                defaultValue={chat.title || "Untitled Chat"}
                onBlur={(e) => handleRenameBlur(chat.id, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.target.blur();
                  if (e.key === "Escape") setEditingChatId(null);
                }}
                autoFocus
              />
            ) : (
              <button
                onClick={() => handleTitleClick(chat.id)}
                className="w-full text-left h-full flex items-center"
                title={chat.title || "Untitled Chat"}
              >
                <div className="w-full">
                  {/* Primary title line - always visible */}
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {chat.title || "Untitled Chat"}
                  </div>
                  {/* Secondary line - shows preview or timestamp */}
                  <div className="text-xs text-gray-500 truncate mt-1">
                    {chat.lastMessage
                      ? chat.lastMessage.substring(0, 40) +
                        (chat.lastMessage.length > 40 ? "..." : "")
                      : new Date(
                          chat.createdAt || Date.now()
                        ).toLocaleDateString()}
                  </div>
                </div>
              </button>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center space-x-2 flex-shrink-0">
            {editingChatId !== chat.id && (
              <button
                onClick={(e) => handleRenameClick(chat.id, e)}
                className="text-gray-400 text-sm hover:text-blue-600 p-1 rounded hover:bg-gray-200"
                title="Rename chat"
              >
                ✏️
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(chat.id);
              }}
              className="text-red-500 text-xs hover:text-red-700 p-1 rounded hover:bg-red-100"
              title="Delete chat"
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
