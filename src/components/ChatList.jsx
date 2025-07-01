import React, { useState } from "react";

export default function ChatList({
  chats,
  currentId,
  onSelect,
  onDelete,
  onRename,
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
    <div className="w-80 bg-white border-r border-gray-200 p-6 space-y-3">
      <h2 className="font-bold text-xl mb-4">💬 My Chats</h2>
      {chats.length === 0 && (
        <p className="text-base text-gray-500">No chats yet.</p>
      )}
      {chats.map((chat) => (
        <div
          key={chat.id}
          className={`group flex items-center justify-between rounded-lg hover:bg-gray-100 px-3 py-2 ${
            chat.id === currentId ? "bg-blue-100 font-semibold" : ""
          }`}
        >
          <div className="flex-1 text-left text-base truncate">
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
                className="w-full text-left truncate"
                title={chat.title || "Untitled Chat"}
              >
                {chat.title || "Untitled Chat"}
              </button>
            )}
          </div>

          {/* Fixed: Use visibility instead of opacity + always show when editing */}
          <div className="flex items-center space-x-3">
            {editingChatId !== chat.id && (
              <button
                onClick={(e) => handleRenameClick(chat.id, e)}
                className="text-gray-400 text-sm hover:text-blue-600"
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
              className="text-red-500 text-xs hover:text-red-700"
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
