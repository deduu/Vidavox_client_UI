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
  uploadAttachment,
} from "../services/api";
import { X, ChevronDown, ChevronUp, Settings, FileText } from "lucide-react"; // Import FileText

export default function ChatPage() {
  const [chatMode, setChatMode] = useState("normal");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const [kbs, setKbs] = useState([]);
  const [selectedKbs, setSelectedKbs] = useState([]);

  const [model, setModel] = useState("meta-llama/Llama-3.1-8B-Instruct");
  const [missingApiKey, setMissingApiKey] = useState(null); // null or a string

  const [streaming, setStreaming] = useState(true);
  const [maxTokens, setMaxTokens] = useState(256);
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
  const [attachments, setAttachments] = useState([]); // [{ id, file, meta, progress, uploading, error }]
  const [typing, setTyping] = useState(false);
  const [pendingId, setPendingId] = useState(null); // for placeholder bubbles

  const ac = new AbortController();
  const { signal } = ac;

  const logChatDebug = (stage, payload) => {
    try {
      // keep the last payload/response on window for easy inspection
      window.__lastChatDirect = window.__lastChatDirect || {};
      window.__lastChatDirect[stage] = payload;

      const label = `🛰 chatDirect ${stage}`;
      // collapse noisy blobs but keep them accessible
      console.groupCollapsed(label);
      console.log(payload);
      console.groupEnd(label);
    } catch {}
  };

  useEffect(() => {
    if (selectedKbs?.length) {
      persistKBs(selectedKbs);
    } else {
      // if cleared, also clear storage so new chats start empty
      localStorage.removeItem(KB_STORAGE_KEY);
    }
  }, [selectedKbs]);

  useEffect(() => {
    listLLMs()
      .then((list) => {
        setAvailableModels(list);

        const savedModel = localStorage.getItem("selectedModel");
        const fallback =
          list.find((m) => m.id === "gemini-2.0-flash") || list[0];

        if (savedModel && list.some((m) => m.id === savedModel)) {
          setModel(savedModel);
        } else {
          setModel(fallback.id);
        }
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
      .then((all) => {
        setKbs(all);

        // If not a brand-new chat, hydrate selection from storage
        const isNewChat = activeChat?.title === "New Chat";
        if (!isNewChat) {
          const ids = loadPersistedKBs();
          if (ids.length) {
            setSelectedKbs(reconcileKBs(ids, all));
          }
        } else {
          // brand-new chat: make sure KBs start empty
          setSelectedKbs([]);
        }
      })
      .catch((err) => console.error("❌ Failed to load KBs:", err));
    // include activeChat so this re-evaluates on chat change
  }, [activeChat?.id]);

  useEffect(() => {
    if (activeChat?.title === "New Chat") {
      setSelectedKbs([]);
      localStorage.removeItem(KB_STORAGE_KEY);
    }
  }, [activeChat?.title]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history.length]);

  // ---- KB persistence helpers ----
  const KB_STORAGE_KEY = "selectedKbs.v1";

  // Only store minimal info to avoid staleness
  const persistKBs = (kbs) => {
    try {
      const compact = kbs.map((k) => ({ id: k.id }));
      localStorage.setItem(KB_STORAGE_KEY, JSON.stringify(compact));
    } catch {}
  };

  const loadPersistedKBs = () => {
    try {
      const raw = localStorage.getItem(KB_STORAGE_KEY);
      if (!raw) return [];
      const ids = JSON.parse(raw).map((x) => x.id);
      return Array.isArray(ids) ? ids : [];
    } catch {
      return [];
    }
  };

  // Map persisted IDs back to current KB objects (ignore missing/removed KBs)
  const reconcileKBs = (ids, allKbs) => {
    const byId = new Map(allKbs.map((k) => [k.id, k]));
    return ids.map((id) => byId.get(id)).filter(Boolean);
  };

  const sendChatMessageToBackend = async (msg) => {
    console.log("🔸 to‑Backend (frontend):", msg); // <‑‑ add
    const payload = withLegacyFileFields(msg);
    const {
      role,
      content,
      citations,
      chunks,
      file,
      file_url,
      file_name,
      file_type,
    } = payload; // Include file
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

  // Prefer the first image; otherwise the first attachment
  const pickPrimaryAttachment = (atts) => {
    if (!Array.isArray(atts) || !atts.length) return null;
    return atts.find((a) => (a.type || "").startsWith("image/")) || atts[0];
  };

  const withLegacyFileFields = (msg) => {
    const att = pickPrimaryAttachment(msg.attachments);
    if (!att) return { ...msg };

    return {
      ...msg,
      // keep the rich attachments array for the new UI
      attachments: msg.attachments,

      // legacy fields for older backend/UI
      file:
        att.name || att.type
          ? { name: att.name || "file", type: att.type || "" }
          : null,
      file_url: att.display_url || att.url || null, // blob:… for instant preview, server URL as fallback
      file_name: att.name || null,
      file_type: att.type || null,
    };
  };

  const fileToDataUrl = (file) =>
    new Promise((res) => {
      const fr = new FileReader();
      fr.onload = () => res(fr.result); // "data:image/png;base64,…"
      fr.readAsDataURL(file);
    });

  const addFilesAndUpload = async (files) => {
    const list = Array.from(files);
    // create placeholder rows
    const placeholders = list.map((f) => ({
      id: crypto.randomUUID(),
      file: f,
      meta: null,
      progress: 0,
      uploading: true,
      error: null,
      displayUrl: URL.createObjectURL(f), // ✅ for UI preview
    }));
    setAttachments((prev) => [...prev, ...placeholders]);

    // upload each file
    for (const ph of placeholders) {
      try {
        const meta = await uploadAttachment(ph.file, (p) => {
          setAttachments((prev) =>
            prev.map((a) => (a.id === ph.id ? { ...a, progress: p } : a))
          );
        });
        setAttachments((prev) =>
          prev.map((a) =>
            a.id === ph.id ? { ...a, meta, uploading: false, progress: 100 } : a
          )
        );
      } catch (err) {
        console.error("Upload failed:", err);
        setAttachments((prev) =>
          prev.map((a) =>
            a.id === ph.id
              ? {
                  ...a,
                  uploading: false,
                  error: err.message || "Upload failed",
                }
              : a
          )
        );
      }
    }
  };

  const handleSendFileOnly = async (file) => {
    // find the (now) uploaded meta for this file name
    const uploaded = attachments.find(
      (a) =>
        a.file?.name === file.name && a.meta?.url && !a.uploading && !a.error
    );
    if (!uploaded) return;

    const sessionId = currentChatId || "default";
    const userMsg = {
      role: "user",
      content: "",
      attachments: [
        {
          name: file.name,
          type: file.type,
          url: uploaded.meta.url,
          // no object URL here; it's fine, ChatMessage will use `url`
        },
      ],
    };

    setHistory((prev) => [...prev, userMsg]);
    await sendChatMessageToBackend(userMsg);
    await maybeAutoRenameChat(userMsg);

    setSending(true);
    setTyping(true);

    try {
      const reply = await chatDirect({
        model,
        messages: [{ role: "user", content: "(sent an attachment)" }],
        max_tokens: maxTokens,
        temperature,
        attached_image_urls:
          uploaded.meta.type === "image" ? [uploaded.meta.url] : [],
        attached_file_urls:
          uploaded.meta.type !== "image" ? [uploaded.meta.url] : [],
        session_id: sessionId,
      });
      const text = reply.text ?? "";

      await sendChatMessageToBackend({ role: "assistant", content: text });
      setHistory((prev) => [...prev, { role: "assistant", content: text }]);
    } catch (err) {
      console.error("sendFileOnly error:", err);
      setHistory((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "⚠️ Something went wrong. Please try again.",
        },
      ]);
    } finally {
      setTyping(false);
      setSending(false);
      setAttachments((prev) => {
        prev.forEach((a) => a.displayUrl && URL.revokeObjectURL(a.displayUrl));
        return [];
      });
    }
  };

  const handleSend = async () => {
    // const hasAttachment = !!attachedMeta || !!attachedFile;

    const uploaded = attachments.filter((a) => a.meta?.url && !a.uploading);
    const hasAttachment = uploaded.length > 0;

    if (!message.trim() && !hasAttachment) return;

    const sessionId = currentChatId || "default";
    const imageUrls = uploaded
      .filter((a) => a.meta?.type === "image")
      .map((a) => a.meta.url);
    const fileUrls = uploaded
      .filter((a) => a.meta?.type !== "image")
      .map((a) => a.meta.url);
    const isVision = imageUrls.length > 0; // if any image
    const userMsg = {
      role: "user",
      content: message,
      // file_url: imageUrls[0] || fileUrls[0] || null,
      attachments: uploaded.map((a) => ({
        name: a.file?.name,
        type: a.file?.type,
        url: a.meta?.url,
        display_url: a.displayUrl,
      })),
    };
    console.log("userMsg being appended:", userMsg);

    await sendChatMessageToBackend(userMsg); // backend stores data‑URL
    // Store file info
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
        setTyping(true);
        const res = await sendChatMessage({
          message,
          knowledgeBaseFileIds: allFileIds,
          topK,
          threshold,
          file: attachedFile, // Optional
          session_id: sessionId,
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
        setTyping(false);
      } else {
        // await sendChatMessageToBackend(userMsg);
        await maybeAutoRenameChat(userMsg);

        // const mustStream = streaming && !attachedFile;
        const mustStream = streaming && !isVision; // vision => force non-stream

        if (mustStream) {
          setTyping(true);
          let gotFirst = false;
          let assistantMsg = { role: "assistant", content: "" };

          const payload = {
            model,
            messages: [{ role: "user", content: message }],
            max_tokens: maxTokens,
            temperature,
            attached_image_urls: imageUrls,
            attached_file_urls: fileUrls,
            session_id: sessionId,
          };
          logChatDebug("request(stream)", payload);

          // setHistory((prev) => [...prev, assistantMsg]);

          for await (const token of chatDirectStream(payload)) {
            if (!gotFirst) {
              gotFirst = true;
              setTyping(false);
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
          const payload = {
            model,
            messages: [{ role: "user", content: message }],
            max_tokens: maxTokens,
            temperature,
            attached_image_urls: imageUrls,
            attached_file_urls: fileUrls,
            session_id: sessionId,
          };
          logChatDebug("request", payload);
          const reply = await chatDirect(payload);
          logChatDebug("response", reply);
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
      logChatDebug("error", {
        status,
        serverMsg,
        model,
        imageUrls,
        fileUrls,
      });
      // Improved fallback logic
      const isMissingKey =
        status === 403 ||
        status === 401 ||
        /missing\s*api\s*key/i.test(msg) ||
        /api key.*missing/i.test(msg) ||
        /unauthorized/i.test(msg);

      if (isMissingKey) {
        console.warn("🚨 Detected missing API key error:", { status, msg });

        setMissingApiKey(
          msg.includes("API key")
            ? msg
            : "API key missing or invalid. Please update your key in profile settings."
        );

        setTyping(false); // 🔥 Must be called here too
      } else {
        setTyping(false); // ✅ Always clear typing
        setHistory((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "⚠️ Something went wrong. Please try again.",
          },
        ]);
      }
    } finally {
      setSending(false);
      // setAttachedFile(null);
      // setAttachedMeta(null);
      // setUploading(false);
      // setUploadProgress(0);
      setAttachments([]);
    }
  };

  const handlePasteImage = async (file) => {
    // forward a single pasted image into the same uploader pipeline
    await addFilesAndUpload([file]);
  };

  const handleAttachFiles = async (files) => {
    if (!files || files.length === 0) return;

    await addFilesAndUpload(files);
  };

  const handleRemoveAttachment = (id) => {
    setAttachments((prev) => {
      const target = prev.find((a) => a.id === id);
      if (target?.displayUrl) URL.revokeObjectURL(target.displayUrl);
      return prev.filter((a) => a.id !== id);
    });
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
                  onChange={(e) => {
                    const value = e.target.value;
                    setModel(value);
                    localStorage.setItem("selectedModel", value);
                  }}
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
              <div
                // className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4 rounded shadow animate-bounce"
                className="animate-fade-in border-l-4 border-yellow-500 bg-yellow-100 text-yellow-700 p-4 mb-4 rounded shadow pulse-slow"
                ref={(el) =>
                  el?.scrollIntoView({ behavior: "smooth", block: "center" })
                }
              >
                <p className="font-bold text-lg">🚨 Missing API Key</p>
                <p className="text-sm">{missingApiKey}</p>
                <p className="mt-2 text-sm">
                  Please{" "}
                  <a
                    href="/profile"
                    className="underline text-blue-600 font-semibold"
                  >
                    go to your profile
                  </a>{" "}
                  and add the API key to continue using this model.
                </p>
                <button
                  className="mt-3 text-xs bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded transition"
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
              {typing && (
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
                onAttachFiles={handleAttachFiles} // Pass the handler
                attachments={attachments} // Pass the attached file state
                onRemoveAttachment={handleRemoveAttachment} // Pass the removal handler
                onSendFileOnly={handleSendFileOnly}
                onPasteImage={handlePasteImage}
                autoSendOnAttach
                // uploading={uploading}
                // uploadProgress={uploadProgress}
              />
            </div>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}
