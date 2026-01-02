import { useState, useRef, useEffect } from "react";

export default function ChatListItem({
  chat,
  isActive,
  onSelect,
  onDelete,
  onRename,
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(chat.title);
  const inputRef = useRef();

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const save = () => {
    setEditing(false);
    onRename(chat.id, title);
  };

  return (
    <div
      onClick={() => onSelect(chat.id)}
      className={`flex items-center justify-between p-2 cursor-pointer ${
        isActive ? "bg-blue-200" : "hover:bg-gray-100"
      }`}
    >
      {editing ? (
        <input
          ref={inputRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => e.key === "Enter" && save()}
          className="flex-1 border-b"
        />
      ) : (
        <span className="flex-1 truncate">{chat.title}</span>
      )}

      <div className="flex space-x-1 ml-2 text-sm opacity-0 hover:opacity-100">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setEditing(true);
          }}
          title="Rename"
        >
          ✏️
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(chat.id);
          }}
          title="Delete"
        >
          🗑️
        </button>
      </div>
    </div>
  );
}
