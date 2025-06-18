import React, { useState, useEffect, useContext } from "react";
import { AuthContext } from "../contexts/AuthContext";
import { fetchFolderTree, sendChat } from "../services/api";
import KnowledgeSelector from "../components/KnowledgeSelector";

export default function ChatPage() {
  const { user } = useContext(AuthContext);
  const [tree, setTree] = useState([]);
  const [selected, setSelected] = useState({ folder_ids: [], file_ids: [] });
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // load tree once
  useEffect(() => {
    fetchFolderTree().then(setTree);
  }, []);

  const handleKnowledgeChange = (ids) => {
    // split ids into folder_ids vs file_ids by looking up node.type
    const folders = [];
    const files = [];
    function walk(nodes) {
      for (let n of nodes) {
        if (ids.includes(n.id)) {
          if (n.type === "folder") folders.push(n.id);
          else files.push(n.id);
        }
        if (n.children) walk(n.children);
      }
    }
    walk(tree);
    setSelected({ folder_ids: folders, file_ids: files });
  };

  const send = async () => {
    if (!input.trim()) return;
    const userMsg = { sender: "user", text: input };
    setMessages((msgs) => [...msgs, userMsg]);
    setLoading(true);

    try {
      const { answer } = await sendChat({
        question: input,
        folder_ids: selected.folder_ids,
        file_ids: selected.file_ids,
      });
      setMessages((msgs) => [...msgs, { sender: "ai", text: answer }]);
    } catch (e) {
      setMessages((msgs) => [...msgs, { sender: "error", text: e.message }]);
    } finally {
      setLoading(false);
      setInput("");
    }
  };

  return (
    <div className="flex h-full">
      <KnowledgeSelector
        tree={tree}
        onChange={(ids) => handleKnowledgeChange(ids)}
      />

      <div className="flex-1 flex flex-col">
        {/* Messages */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`p-3 rounded-lg max-w-xl ${
                m.sender === "user"
                  ? "self-end bg-blue-100"
                  : m.sender === "ai"
                  ? "self-start bg-gray-100"
                  : "self-center bg-red-100 text-red-700"
              }`}
            >
              {m.text}
            </div>
          ))}
        </div>

        {/* Input */}
        <footer className="p-4 border-t flex items-center">
          <textarea
            className="flex-1 border rounded p-2 mr-2"
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
          />
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "…" : "Send"}
          </button>
        </footer>
      </div>
    </div>
  );
}
