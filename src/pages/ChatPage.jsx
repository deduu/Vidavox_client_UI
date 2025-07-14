// Updated ChatPage.jsx
import React, { useEffect, useState, useRef } from "react";
import SidebarLayout from "../components/SidebarLayout";
import ChatMessage from "../components/ChatMessage";
import ChatInput from "../components/ChatInput";
import KnowledgeBaseSelector from "../components/KnowledgeBaseSelector"; // Import the new component
import { useChatSession } from "../contexts/ChatSessionContext";
import {
  sendChatMessage,
  listKnowledgeBases,
  chatDirect,
  chatDirectStream,
  listLLMs,
} from "../services/api";

export default function ChatPage() {
  // UI state
  const [chatMode, setChatMode] = useState("normal");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  // KB state - Updated to support multiple selections
  const [kbs, setKbs] = useState([]);
  const [selectedKbs, setSelectedKbs] = useState([]); // Changed from selectedKb to selectedKbs

  // LLM options
  const [model, setModel] = useState("gemini 2.0 Flash");
  const [streaming, setStreaming] = useState(true);
  const [maxTokens, setMaxTokens] = useState(1024);
  const [temperature, setTemperature] = useState(0.8);

  // Chat session context
  const {
    chats,
    currentChatId,
    sendMessageToCurrentChat,
    loadMessagesForCurrentChat,
    messagesMap,
    renameChat,
  } = useChatSession();

  const [availableModels, setAvailableModels] = useState([]);
  const [history, setHistory] = useState([]);

  // --- sanity‐check your chats/history so history.map never crashes ---
  // console.log("🏷️ chats:", chats);
  // console.log("🏷️ currentChatId:", currentChatId);
  const activeChat = chats.find((c) => c.id === currentChatId);
  // console.log("🏷️ activeChat:", activeChat);

  /* ----- load on mount ----- */
  useEffect(() => {
    listLLMs()
      .then((list) => {
        setAvailableModels(list);

        // choose default "Gemini 2.0 Flash" if present, else first item
        const preferred = list.find((m) => m.id === "gemini-2.0-flash");
        const fallback = list[0];
        setModel((cur) =>
          cur && list.some((m) => m.id === cur)
            ? cur
            : (preferred || fallback).id
        );
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!currentChatId) return;
    (async () => {
      const msgs = await loadMessagesForCurrentChat();
      console.debug("📜 Loaded chat messages:", msgs);
      setHistory(msgs);
    })();
  }, [currentChatId, messagesMap]);

  // console.log("🏷️ history:", history);

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
        console.error("❌ Failed to load KBs:", err);
      });
  }, []);

  // Auto‐scroll when history changes
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history.length]);

  const sendChatMessageToBackend = async (msg) => {
    const { role, content, citations, chunks } = msg;
    // console.log("📤 Sending to backend:", {
    //   role,
    //   content,
    //   citations,
    //   chunks,
    // });
    await sendMessageToCurrentChat({
      role,
      content,
      citations,
      chunks,
    });
  };

  const maybeAutoRenameChat = async (msg) => {
    if (activeChat?.title === "New Chat" && msg.role === "user") {
      const autoTitle =
        msg.content.split("\n")[0].slice(0, 40).trim() +
        (msg.content.length > 40 ? "…" : "");

      try {
        await renameChat(currentChatId, autoTitle);
      } catch (err) {
        console.error("❌ Failed to auto-rename chat:", err);
      }
    }
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
      // Updated to handle multiple KBs
      if (selectedKbs.length > 0) {
        // ── ROUTE A: KB‐based RAG call ──
        // console.log(
        //   "🔍 Using KBs:",
        //   selectedKbs.map((kb) => kb.name)
        // );

        // Collect all file IDs from selected KBs
        const allFileIds = selectedKbs.flatMap((kb) =>
          kb.files.map((f) => f.id)
        );

        const res = await sendChatMessage({
          message,
          knowledgeBaseFileIds: allFileIds,
        });
        console.log("✅ RAG response:", res);
        const assistantMsg = {
          role: "assistant",
          content: res.response.answer,
          citations: res.response.citations || [],
          chunks: res.response.used_chunks || [],
        };
        console.log("🧠 AssistantMsg:", assistantMsg);
        await sendChatMessageToBackend(userMsg);
        await maybeAutoRenameChat(userMsg);
        await sendChatMessageToBackend(assistantMsg);
        setHistory((prev) => [...prev, assistantMsg]);
      } else {
        await sendChatMessageToBackend(userMsg);
        await maybeAutoRenameChat(userMsg);
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
        <div className="flex flex-wrap items-start justify-between gap-4 p-4 border-b bg-gray-50">
          <h2 className="text-xl font-bold">Agentic Chat</h2>

          <div className="flex flex-wrap items-center gap-4">
            {/* Model Selector */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">Model</label>
              <select
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                disabled={!availableModels.length}
              >
                {availableModels.map(({ id, label }) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* Knowledge Base Selector */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">
                Knowledge Bases
              </label>
              <KnowledgeBaseSelector
                kbs={kbs}
                selectedKbs={selectedKbs}
                onSelectionChange={setSelectedKbs}
                disabled={sending}
              />
            </div>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {history.length ? (
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
