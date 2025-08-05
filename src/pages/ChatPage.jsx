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
import { X, ChevronDown, ChevronUp, Settings, FileText } from "lucide-react"; // Import FileText

export default function ChatPage() {
  const [chatMode, setChatMode] = useState("normal");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const [kbs, setKbs] = useState([]);
  const [selectedKbs, setSelectedKbs] = useState([]);

  const [model, setModel] = useState("gemini 2.0 Flash");
  const [missingApiKey, setMissingApiKey] = useState(null); // null or a string

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
  const [attachedFile, setAttachedFile] = useState(null); // New state for attached file

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
    console.log("📌 Model changed to:", model);
  }, [model]);

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
    console.log("🔸 to‑Backend (frontend):", msg); // <‑‑ add
    const {
      role,
      content,
      citations,
      chunks,
      file,
      file_url,
      file_name,
      file_type,
    } = msg; // Include file
    await sendMessageToCurrentChat({
      role,
      content,
      citations,
      chunks,
      file,
      file_url,
      file_name,
      file_type,
    });
    // await sendMessageToCurrentChat({ role, content, citations, chunks, file });
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

  const fileToDataUrl = (file) =>
    new Promise((res) => {
      const fr = new FileReader();
      fr.onload = () => res(fr.result); // "data:image/png;base64,…"
      fr.readAsDataURL(file);
    });

  const handleSend = async () => {
    if (!message.trim() && !attachedFile) return; // Allow sending with only a file
    const sessionId = currentChatId || "default";
    const previewUrl = attachedFile ? await fileToDataUrl(attachedFile) : null;
    console.log("📥 previewUrl:", previewUrl);
    const userMsg = {
      role: "user",
      content: message,
      file: attachedFile
        ? { name: attachedFile.name, type: attachedFile.type }
        : null,
      file_url: previewUrl, // now a data‑URL, not blob
    };
    await sendChatMessageToBackend(userMsg); // backend stores data‑URL
    // Store file info
    const baseHistory = [...history, userMsg];
    setHistory(baseHistory);
    setMessage("");
    setAttachedFile(null); // Clear attached file after sending
    setSending(true);

    try {
      // Revoke preview URL later to prevent memory leak
      if (previewUrl) {
        setTimeout(() => {
          URL.revokeObjectURL(previewUrl);
        }, 10000); // 10 seconds is safe for display
      }
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
          file: attachedFile, // Optional
        });

        const assistantMsg = {
          role: "assistant",
          content: res.response.answer,
          citations: res.response.citations || [],
          chunks: res.response.used_chunks || [],
        };
        // await sendChatMessageToBackend(userMsg);
        await maybeAutoRenameChat(userMsg);
        await sendChatMessageToBackend(assistantMsg);
        setHistory((prev) => [...prev, assistantMsg]);
      } else {
        // await sendChatMessageToBackend(userMsg);
        await maybeAutoRenameChat(userMsg);

        const mustStream = streaming && !attachedFile;
        if (mustStream) {
          let gotFirst = false;
          let assistantMsg = { role: "assistant", content: "" };
          // setHistory((prev) => [...prev, assistantMsg]);

          for await (const token of chatDirectStream({
            model,
            // messages: baseHistory.map((msg) => ({
            //   role: msg.role,
            //   content: msg.content,
            // })),
            messages: [{ role: "user", content: message }], // Send only text content to LLM
            max_tokens: maxTokens,
            temperature,
            file: attachedFile, // Optional
            session_id: sessionId,
          })) {
            if (!gotFirst) {
              gotFirst = true;
              assistantMsg = { role: "assistant", content: token };
              setHistory((prev) => [...prev, assistantMsg]);
            } else {
              assistantMsg.content += token;
              setHistory((prev) => {
                const copy = [...prev];
                copy[copy.length - 1] = { ...assistantMsg };
                return copy;
              });
            }

            setTimeout(() => {
              scrollRef.current?.scrollIntoView({ behavior: "smooth" });
            }, 10);
          }

          await sendChatMessageToBackend(assistantMsg);
        } else {
          const reply = await chatDirect({
            model,
            // messages: baseHistory.map((msg) => ({
            //   role: msg.role,
            //   content: msg.content,
            // })),
            messages: [{ role: "user", content: message }], // Send only text content to LLM
            max_tokens: maxTokens,
            temperature,
            file: attachedFile, // Optional
            session_id: sessionId,
          });
          const assistantMsg = {
            role: "assistant",
            content: reply.text,
            // file_url: reply.file_url || null,
          };
          await sendChatMessageToBackend(assistantMsg);
          setHistory((prev) => [...prev, assistantMsg]);
        }
      }
    } catch (err) {
      console.error("❌ handleSend error:", err);

      const status = err?.response?.status;
      const serverMsg = err?.response?.data?.detail;
      const msg = serverMsg || err?.message || String(err);

      const isMissingKey =
        status === 401 ||
        status === 403 ||
        /missing\s*api\s*key/i.test(msg) ||
        /api key.*missing/i.test(msg);

      if (isMissingKey) {
        console.warn("🚨 setting missingApiKey:", msg);
        setMissingApiKey(msg);
      } else {
        setHistory((prev) => [
          ...prev,
          { role: "assistant", content: "⚠️ Something went wrong." },
        ]);
      }
    } finally {
      setSending(false);
    }
  };

  const handleAttachFile = (file) => {
    setAttachedFile(file);
  };

  const handleRemoveAttachedFile = () => {
    setAttachedFile(null);
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
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Chat Area - Centered with max width */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-4 py-6">
            {/* 👇 Add warning here */}
            {missingApiKey && (
              <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4 rounded shadow">
                <p className="font-medium">Missing API Key</p>
                <p className="text-sm">{missingApiKey}</p>
                <p className="mt-2 text-sm">
                  Please{" "}
                  <a href="/profile" className="underline text-blue-600">
                    go to your profile
                  </a>{" "}
                  and add the API key to continue using this model.
                </p>
                <button
                  className="mt-3 text-xs bg-yellow-500 text-white px-3 py-1 rounded"
                  onClick={() => setMissingApiKey(null)}
                >
                  Dismiss
                </button>
              </div>
            )}
            <div className="space-y-6">
              {history.length ? (
                history.map((msg, i) => (
                  <ChatMessage
                    key={i}
                    msg={msg}
                    onCopy={() => navigator.clipboard.writeText(msg.content)}
                    onDownload={(m) => {
                      const blob = new Blob([m.content], {
                        type: "text/plain",
                      });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = "message.txt";
                      a.click();
                    }}
                  />
                ))
              ) : (
                <div className="text-center text-gray-500 py-12">
                  <div className="text-xl font-medium mb-3">
                    Welcome to Agentic Chat
                  </div>
                  <p className="text-sm max-w-md mx-auto">
                    {hasKnowledgeBases
                      ? "Your knowledge bases are ready. Start asking questions!"
                      : "Start typing to begin the conversation or select knowledge bases for enhanced responses."}
                  </p>
                </div>
              )}
              {sending && (
                <div className="text-gray-500 italic flex items-center gap-2 justify-left py-4">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-100"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-200"></div>
                  </div>
                  Assistant is typing...
                </div>
              )}
            </div>
          </div>
          <div ref={scrollRef} />
        </div>

        {/* Input Area - Modern rounded design */}
        <div className="flex-shrink-0 bg-gradient-to-t from-white via-white to-white/80 pt-4 pb-6">
          <div className="max-w-4xl mx-auto px-4">
            <div className="bg-white rounded-2xl border border-gray-200/50 overflow-visible">
              <ChatInput
                message={message}
                setMessage={setMessage}
                onSend={handleSend}
                disabled={sending}
                onAttachFile={handleAttachFile} // Pass the handler
                attachedFile={attachedFile} // Pass the attached file state
                onRemoveAttachedFile={handleRemoveAttachedFile} // Pass the removal handler
              />
            </div>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}
