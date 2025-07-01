import { useEffect, useState, useRef } from "react";
import { sendChatMessage, listKnowledgeBases } from "../services/api";
import SidebarLayout from "../components/SidebarLayout";

import ChatList from "../components/ChatList";
import ChatMessage from "../components/ChatMessage";
import ChatInput from "../components/ChatInput";

import { v4 as uuidv4 } from "uuid";

export default function ChatPage() {
  const [message, setMessage] = useState("");
  const [chats, setChats] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [sending, setSending] = useState(false);
  const [selectedKbId, setSelectedKbId] = useState(null);
  const [knowledgeBases, setKnowledgeBases] = useState([]);
  const [editingMsg, setEditingMsg] = useState(null);

  const scrollRef = useRef(null);

  // current chat & history
  const currentChat = chats.find((c) => c.id === currentChatId);
  const history = currentChat?.messages || [];

  // load from localStorage + KBs
  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("chatSessions") || "[]");
    if (stored.length) {
      setChats(stored);
      setCurrentChatId(stored[0].id);
    } else {
      createNewChat();
    }

    listKnowledgeBases()
      .then(setKnowledgeBases)
      .catch((e) => console.error("Failed to load KBs", e));
  }, []);

  // persist chats
  useEffect(() => {
    localStorage.setItem("chatSessions", JSON.stringify(chats));
  }, [chats]);

  // auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  // crud for chats
  const createNewChat = () => {
    const id = uuidv4();
    setChats((prev) => [{ id, title: "New Chat", messages: [] }, ...prev]);
    setCurrentChatId(id);
  };
  const updateCurrentChat = (messages) => {
    setChats((prev) =>
      prev.map((c) =>
        c.id === currentChatId
          ? {
              ...c,
              messages,
              title:
                c.title === "New Chat" && messages.length
                  ? messages[0].content.slice(0, 40) +
                    (messages[0].content.length > 40 ? "…" : "")
                  : c.title,
            }
          : c
      )
    );
  };
  const deleteChat = (id) => {
    const filtered = chats.filter((c) => c.id !== id);
    setChats(filtered);
    if (id === currentChatId) {
      filtered.length ? setCurrentChatId(filtered[0].id) : createNewChat();
    }
  };
  const renameChat = (id, newTitle) => {
    setChats((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title: newTitle } : c))
    );
  };

  // message actions
  const handleCopy = (msg) => {
    navigator.clipboard.writeText(msg.content);
  };
  const handleEdit = (msg) => {
    setMessage(msg.content);
    setEditingMsg(msg);
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

  // stubs for file/image upload
  const handleAttachFile = (file) => {
    console.log("Attach file:", file);
    // TODO: upload & then push a message to chat
  };
  const handlePasteImage = (file) => {
    console.log("Pasted image:", file);
    // TODO: upload & then push a message to chat
  };

  // send or edit
  const handleSend = async () => {
    if (!message.trim() || !currentChatId) return;

    // editing existing
    if (editingMsg) {
      const newHist = history.map((m) =>
        m === editingMsg ? { ...m, content: message } : m
      );
      updateCurrentChat(newHist);
      setEditingMsg(null);
      setMessage("");
      return;
    }

    // new user message
    const userMsg = { role: "user", content: message };
    const updated = [...history, userMsg];
    updateCurrentChat(updated);

    setSending(true);
    setMessage("");

    try {
      const kb = knowledgeBases.find(
        (k) => String(k.id) === String(selectedKbId)
      );
      const fileIds = kb ? kb.files.map((f) => f.id) : [];

      const res = await sendChatMessage({
        message,
        knowledgeBaseFileIds: fileIds,
      });

      const assistantMsg = {
        role: "assistant",
        content: res.response.answer,
        citations: res.response.citations || [],
        chunks: res.response.used_chunks || [],
      };
      updateCurrentChat([...updated, assistantMsg]);
    } catch (err) {
      const errMsg = err.message?.includes("Insufficient credits")
        ? "🚨 Not enough credits."
        : "⚠️ Error occurred.";
      updateCurrentChat([...updated, { role: "assistant", content: errMsg }]);
    } finally {
      setSending(false);
    }
  };

  return (
    <SidebarLayout>
      <div className="flex h-[calc(100vh-2rem)] bg-gray-50 rounded-lg shadow overflow-hidden">
        <ChatList
          chats={chats}
          currentId={currentChatId}
          onSelect={setCurrentChatId}
          onDelete={deleteChat}
          onRename={renameChat}
        />

        <div className="flex-1 flex flex-col">
          {/* header */}
          <div className="border-b p-4 flex justify-between items-center">
            <h1 className="font-bold text-xl">💬 Agentic Chat</h1>
            <button
              onClick={createNewChat}
              className="text-sm bg-blue-600 text-white px-3 py-1 rounded shadow hover:bg-blue-700"
            >
              ➕ New Chat
            </button>
          </div>

          {/* KB selector */}
          <div className="p-4 bg-white border-b">
            <label className="block text-sm font-medium mb-1">
              Knowledge Base:
            </label>
            <select
              className="border px-3 py-2 rounded w-full"
              value={selectedKbId || ""}
              onChange={(e) => setSelectedKbId(e.target.value || null)}
            >
              <option value="">🔓 No grounding (free-form)</option>
              {knowledgeBases.map((kb) => (
                <option key={kb.id} value={kb.id}>
                  📚 {kb.name} ({kb.file_count} files)
                </option>
              ))}
            </select>
          </div>

          {/* message list */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {history.map((msg, i) => (
              <ChatMessage
                key={i}
                msg={msg}
                onCopy={handleCopy}
                onEdit={handleEdit}
                onDownload={handleDownload}
              />
            ))}
            {/* ✅ Add this */}
            {sending && (
              <ChatMessage
                msg={{ role: "assistant", content: "Typing..." }}
                onCopy={() => {}}
                onEdit={() => {}}
                onDownload={() => {}}
              />
            )}
            <div ref={scrollRef} />
          </div>

          {/* input */}
          <ChatInput
            message={message}
            setMessage={setMessage}
            onSend={handleSend}
            onAttachFile={handleAttachFile}
            onPasteImage={handlePasteImage}
            disabled={sending}
          />
        </div>
      </div>
    </SidebarLayout>
  );
}
