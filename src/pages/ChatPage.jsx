// pages/ChatPage.jsx
import React, { useEffect, useState, useRef } from "react";
import SidebarLayout from "../components/SidebarLayout";
import ChatMessage from "../components/ChatMessage";
import ChatInput from "../components/ChatInput";
import MultiModelChatPanel from "../components/MultiModelChatPanel";
import { useChatSession } from "../contexts/ChatSessionContext";
import {
  sendChatMessage,
  listKnowledgeBases,
  chatDirect,
  chatDirectStream,
} from "../services/api";

export default function ChatPage() {
  // UI state
  const [chatMode, setChatMode] = useState("normal");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  // KB state
  const [kbs, setKbs] = useState([]);
  const [selectedKb, setSelectedKb] = useState("");

  // LLM options
  const [model, setModel] = useState("openai");
  const [streaming, setStreaming] = useState(true);
  const [maxTokens, setMaxTokens] = useState(1024);
  const [temperature, setTemperature] = useState(0.8);

  // Chat session context
  const {
    chats,
    currentChatId,
    setCurrentChatId,
    createNewChat,
    sendMessageToCurrentChat,
    loadMessagesForCurrentChat,
    messagesMap,
  } = useChatSession();

  const [history, setHistory] = useState([]);

  // --- sanity‐check your chats/history so history.map never crashes ---
  console.log("🏷️ chats:", chats);
  console.log("🏷️ currentChatId:", currentChatId);
  const activeChat = chats.find((c) => c.id === currentChatId);
  console.log("🏷️ activeChat:", activeChat);

  useEffect(() => {
    if (!currentChatId) return;
    (async () => {
      const msgs = await loadMessagesForCurrentChat();
      setHistory(msgs);
    })();
  }, [currentChatId, messagesMap]);
  console.log("🏷️ history:", history);

  const scrollRef = useRef();

  // Load KBs once
  useEffect(() => {
    console.log("🔄 Fetching KB list...");
    listKnowledgeBases()
      .then((list) => {
        // console.log("✅ KBs loaded:", list);
        setKbs(list);
      })
      .catch((err) => {
        // console.error("❌ Failed to load KBs:", err);
      });
  }, []);

  // Auto‐scroll when history changes
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history.length]);

  const sendChatMessageToBackend = async (msg) => {
    const { role, content, citations = null, chunks = null } = msg;
    await sendMessageToCurrentChat({ role, content, citations, chunks });
  };

  const handleSend = async () => {
    if (!message.trim()) {
      console.log("🛑 Empty message, ignoring send.");
      return;
    }

    // console.log("▶️ Sending message:", message);
    const userMsg = { role: "user", content: message };
    const baseHistory = [...history, userMsg];
    // console.log("📚 New history:", baseHistory);

    // Optimistic UI update
    setHistory(baseHistory);
    setMessage("");
    setSending(true);

    try {
      const kb = kbs.find((k) => String(k.id) === selectedKb);
      if (kb) {
        // ── ROUTE A: KB‐based RAG call ──
        console.log("🔍 Using KB:", kb.name);
        const fileIds = kb.files.map((f) => f.id);
        const res = await sendChatMessage({
          message,
          knowledgeBaseFileIds: fileIds,
        });
        console.log("✅ RAG response:", res);
        const assistantMsg = {
          role: "assistant",
          content: res.response.answer,
        };
        await sendChatMessageToBackend(userMsg); // <-- send to backend
        await sendChatMessageToBackend(assistantMsg); // <-- send to backend
        setHistory((prev) => [...prev, assistantMsg]);
      } else {
        await sendChatMessageToBackend(userMsg);
        // ── ROUTE B: Direct LLM chat ──
        console.log(`💬 Direct chat (model=${model}, stream=${streaming})`);

        if (streaming) {
          console.log("⏳ Streaming branch…");
          const assistantMsg = { role: "assistant", content: "" };
          setHistory((prev) => [...prev, assistantMsg]);

          for await (const token of chatDirectStream({
            model,
            messages: baseHistory,
            max_tokens: maxTokens,
            temperature,
          })) {
            assistantMsg.content += token;
            setHistory((prev) => {
              const copy = [...prev];
              copy[copy.length - 1] = { ...assistantMsg }; // trigger re-render
              return copy;
            });
            setTimeout(() => {
              scrollRef.current?.scrollIntoView({ behavior: "smooth" });
            }, 10);
          }

          console.log("✅ Streaming complete.");
          await sendChatMessageToBackend(assistantMsg);
        } else {
          console.log("⏳ Non‐stream branch…");
          const reply = await chatDirect({
            model,
            messages: baseHistory,
            max_tokens: maxTokens,
            temperature,
          });
          console.log("📬 Full reply:", reply);
          const assistantMsg = { role: "assistant", content: reply };
          await sendChatMessageToBackend(assistantMsg);
          setHistory((prev) => [...prev, assistantMsg]);
        }
      }
    } catch (err) {
      console.error("❌ handleSend error:", err);
      setHistory((prev) => [
        ...prev,
        { role: "assistant", content: "⚠️ Something went wrong." },
      ]);
    } finally {
      console.log("⏹️ handleSend done");
      setSending(false);
    }
  };

  return (
    <SidebarLayout bottomSlot="Powered by Vidavox">
      <div className="flex flex-col flex-1 h-full bg-white">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 border-b bg-gray-50">
          <h2 className="text-xl font-bold">Agentic Chat</h2>

          <div className="flex items-center gap-2">
            {/* Model */}
            <select
              className="border rounded px-3 py-2"
              value={model}
              onChange={(e) => {
                console.log("🔄 Model →", e.target.value);
                setModel(e.target.value);
              }}
            >
              <option value="openai">OpenAI</option>
            </select>

            {/* Stream Toggle */}
            {/* <label className="flex items-center space-x-1">
              <input
                type="checkbox"
                checked={streaming}
                onChange={(e) => {
                  console.log("🔄 Stream →", e.target.checked);
                  setStreaming(e.target.checked);
                }}
                className="form-checkbox"
              />
              <span className="text-sm">Stream</span>
            </label> */}

            {/* Chat Mode */}
            <select
              className="border rounded px-3 py-2"
              value={chatMode}
              onChange={(e) => {
                console.log("🔄 ChatMode →", e.target.value);
                setChatMode(e.target.value);
              }}
            >
              <option value="normal">🧠 Normal</option>
              <option value="multi">🤖 Multi-Model</option>
            </select>

            {/* KB */}
            <select
              className="border rounded px-3 py-2"
              value={selectedKb}
              onChange={(e) => {
                console.log("🔄 KB →", e.target.value);
                setSelectedKb(e.target.value);
              }}
            >
              <option value="">🔓 No KB</option>
              {kbs.map((kb) => (
                <option key={kb.id} value={kb.id}>
                  {kb.name} ({kb.file_count})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {chatMode === "multi" ? (
            <MultiModelChatPanel history={history} />
          ) : history.length ? (
            history.map((msg, i) => (
              <ChatMessage
                key={i}
                msg={msg}
                onCopy={() => {
                  console.log("📋 Copied:", msg.content);
                  navigator.clipboard.writeText(msg.content);
                }}
                onDownload={(m) => {
                  console.log("⬇️ Downloading:", m.content);
                  const blob = new Blob([m.content], { type: "text/plain" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "message.txt";
                  a.click();
                }}
              />
            ))
          ) : (
            <div className="text-center text-gray-400 mt-8">
              Start typing to begin the conversation…
            </div>
          )}
          {sending && (
            <div className="text-gray-400 italic flex items-center gap-2">
              Assistant is typing
              <span className="dot-typing" />
            </div>
          )}
          <div ref={scrollRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t bg-gray-50">
          <ChatInput
            message={message}
            setMessage={setMessage}
            onSend={() => handleSend(message)}
            disabled={sending}
          />
        </div>
      </div>
    </SidebarLayout>
  );
}
