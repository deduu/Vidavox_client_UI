import React, { useEffect, useState, useRef } from "react";
import SidebarLayout from "../components/SidebarLayout";
import ChatMessage from "../components/ChatMessage";
import ChatInput from "../components/ChatInput";
import KnowledgeBaseSelector from "../components/KnowledgeBaseSelector";
import RAGSettings from "../components/RAGSettings";
import { useChatSession } from "../contexts/ChatSessionContext";
import {
  sendChatMessage,
  listKnowledgeBases,
  chatDirect,
  chatDirectStream,
  listLLMs,
} from "../services/api";
import { X, ChevronDown, ChevronUp, Settings } from "lucide-react";

export default function ChatPage() {
  const [chatMode, setChatMode] = useState("normal");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const [kbs, setKbs] = useState([]);
  const [selectedKbs, setSelectedKbs] = useState([]);

  const [model, setModel] = useState("gemini 2.0 Flash");
  const [streaming, setStreaming] = useState(true);
  const [maxTokens, setMaxTokens] = useState(1024);
  const [temperature, setTemperature] = useState(0.8);

  const [topK, setTopK] = useState(10);
  const [threshold, setThreshold] = useState(0.2);
  const [activePreset, setActivePreset] = useState("balanced");

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
  const activeChat = chats.find((c) => c.id === currentChatId);

  const scrollRef = useRef();

  useEffect(() => {
    listLLMs()
      .then((list) => {
        setAvailableModels(list);
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
      setHistory(msgs);
    })();
  }, [currentChatId, messagesMap]);

  useEffect(() => {
    listKnowledgeBases()
      .then(setKbs)
      .catch((err) => console.error("❌ Failed to load KBs:", err));
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history.length]);

  const sendChatMessageToBackend = async (msg) => {
    const { role, content, citations, chunks } = msg;
    await sendMessageToCurrentChat({ role, content, citations, chunks });
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
    if (!message.trim()) return;

    const userMsg = { role: "user", content: message };
    const baseHistory = [...history, userMsg];
    setHistory(baseHistory);
    setMessage("");
    setSending(true);

    try {
      if (selectedKbs.length > 0) {
        const allFileIds = selectedKbs.flatMap((kb) =>
          kb.files.map((f) => f.id)
        );
        console.log("🔍 Using KBs:", allFileIds);
        const res = await sendChatMessage({
          message,
          knowledgeBaseFileIds: allFileIds,
          topK,
          threshold,
        });
        const assistantMsg = {
          role: "assistant",
          content: res.response.answer,
          citations: res.response.citations || [],
          chunks: res.response.used_chunks || [],
        };
        await sendChatMessageToBackend(userMsg);
        await maybeAutoRenameChat(userMsg);
        await sendChatMessageToBackend(assistantMsg);
        setHistory((prev) => [...prev, assistantMsg]);
      } else {
        await sendChatMessageToBackend(userMsg);
        await maybeAutoRenameChat(userMsg);

        if (streaming) {
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
              copy[copy.length - 1] = { ...assistantMsg };
              return copy;
            });
            setTimeout(() => {
              scrollRef.current?.scrollIntoView({ behavior: "smooth" });
            }, 10);
          }

          await sendChatMessageToBackend(assistantMsg);
        } else {
          const reply = await chatDirect({
            model,
            messages: baseHistory,
            max_tokens: maxTokens,
            temperature,
          });
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
      setSending(false);
    }
  };

  const hasKnowledgeBases = selectedKbs.length > 0;

  const handleTopKChange = (val) => {
    setTopK(val);
    if (
      !(val === 5 && threshold === 0.3) &&
      !(val === 10 && threshold === 0.2) &&
      !(val === 20 && threshold === 0.1)
    ) {
      setActivePreset(null);
    }
  };

  const handleThresholdChange = (val) => {
    setThreshold(val);
    if (
      !(topK === 5 && val === 0.3) &&
      !(topK === 10 && val === 0.2) &&
      !(topK === 20 && val === 0.1)
    ) {
      setActivePreset(null);
    }
  };

  return (
    <SidebarLayout bottomSlot="Powered by Vidavox">
      <div className="flex flex-col flex-1 h-full bg-white">
        {/* Compact Header */}
        <div className="flex-shrink-0 border-b bg-white">
          {/* Main header with title and settings toggle */}
          <div className="px-4 py-2 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Agentic Chat
            </h2>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
              title="Toggle Settings"
            >
              <Settings size={18} />
            </button>
          </div>

          {/* Compact configuration bar - always visible */}
          <div className="px-4 py-2 bg-gray-50 border-t">
            <div className="flex items-center gap-4 flex-wrap">
              {/* Model Selection - Compact */}
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-gray-600 whitespace-nowrap">
                  Model:
                </label>
                <select
                  className="border border-gray-300 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 min-w-32"
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

              {/* Knowledge Base Selection - Compact */}
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-gray-600 whitespace-nowrap">
                  KB:
                </label>
                <KnowledgeBaseSelector
                  kbs={kbs}
                  selectedKbs={selectedKbs}
                  onSelectionChange={setSelectedKbs}
                  disabled={sending}
                />
              </div>

              {/* KB Count indicator */}
              {hasKnowledgeBases && (
                <div className="text-xs text-blue-600 font-medium">
                  {selectedKbs.length} KB{selectedKbs.length > 1 ? "s" : ""}{" "}
                  selected
                </div>
              )}

              {/* Settings toggle for mobile */}
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="md:hidden p-1 text-gray-500 hover:text-gray-700 text-xs flex items-center gap-1"
              >
                Settings
                {showSettings ? (
                  <ChevronUp size={12} />
                ) : (
                  <ChevronDown size={12} />
                )}
              </button>
            </div>

            {/* Selected Knowledge Bases Pills - Compact */}
            {hasKnowledgeBases && (
              <div className="mt-2 pt-2 border-t border-gray-200">
                <div className="flex flex-wrap gap-1">
                  {selectedKbs.map((kb) => (
                    <div
                      key={kb.id}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs"
                    >
                      <span className="font-medium">{kb.name}</span>
                      <span className="text-blue-500 text-xs">
                        ({kb.files.length})
                      </span>
                      <button
                        onClick={() =>
                          setSelectedKbs((prev) =>
                            prev.filter((k) => k.id !== kb.id)
                          )
                        }
                        className="text-blue-500 hover:text-blue-700"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Collapsible Advanced Settings */}
          {showSettings && (
            <div className="px-4 py-3 bg-gray-50 border-t">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-700">
                  Advanced Settings
                </h3>
                <button
                  onClick={() => setShowSettings(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <ChevronUp size={16} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* RAG Settings - Only show when knowledge bases are selected */}
                {hasKnowledgeBases && (
                  <div className="md:col-span-2">
                    <RAGSettings
                      topK={topK}
                      threshold={threshold}
                      onTopKChange={handleTopKChange}
                      onThresholdChange={handleThresholdChange}
                      activePreset={activePreset}
                      setActivePreset={setActivePreset}
                      disabled={sending}
                    />
                  </div>
                )}

                {/* Model Parameters */}
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">
                      Max Tokens: {maxTokens}
                    </label>
                    <input
                      type="range"
                      min="100"
                      max="4000"
                      value={maxTokens}
                      onChange={(e) => setMaxTokens(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">
                      Temperature: {temperature}
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={temperature}
                      onChange={(e) => setTemperature(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={streaming}
                        onChange={(e) => setStreaming(e.target.checked)}
                      />
                      <span className="text-gray-600">Streaming</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Chat Area - Now takes up more space */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {history.length ? (
            history.map((msg, i) => (
              <ChatMessage
                key={i}
                msg={msg}
                onCopy={() => navigator.clipboard.writeText(msg.content)}
                onDownload={(m) => {
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
            <div className="text-center text-gray-500 mt-8">
              <div className="text-lg font-medium mb-2">
                Welcome to Agentic Chat
              </div>
              <p className="text-sm">
                {hasKnowledgeBases
                  ? "Your knowledge bases are ready. Start asking questions!"
                  : "Start typing to begin the conversation or select knowledge bases for enhanced responses."}
              </p>
            </div>
          )}
          {sending && (
            <div className="text-gray-500 italic flex items-center gap-2">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-100"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-200"></div>
              </div>
              Assistant is typing...
            </div>
          )}
          <div ref={scrollRef} />
        </div>

        {/* Input Area - Compact */}
        <div className="flex-shrink-0 border-t bg-white">
          <div className="p-4">
            <ChatInput
              message={message}
              setMessage={setMessage}
              onSend={handleSend}
              disabled={sending}
            />
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}
