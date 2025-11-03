// hooks/useChatPageState.js
import { useState, useEffect } from "react";
import { listKnowledgeBases, listLLMs } from "../services/api";
import { getChatModel, saveChatModel } from "../utils/chatModelStorage";
import { useChatSession } from "../contexts/ChatSessionContext";

export const useChatPageState = (defaultModel) => {
  // Basic UI state
  const [chatMode, setChatMode] = useState("normal");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Knowledge base state
  const [kbs, setKbs] = useState([]);
  const [selectedKbs, setSelectedKbs] = useState([]);

  // Model state
  const [model, setModel] = useState(defaultModel);
  const [availableModels, setAvailableModels] = useState([]);
  const [missingApiKey, setMissingApiKey] = useState(null);

  // Model parameters
  const [streaming, setStreaming] = useState(true);
  const [maxTokens, setMaxTokens] = useState(2048);
  const [temperature, setTemperature] = useState(0.8);

  // RAG parameters
  const [topK, setTopK] = useState(10);
  const [threshold, setThreshold] = useState(0.2);
  const [activePreset, setActivePreset] = useState("balanced");

  // Attachment state
  const [attachments, setAttachments] = useState([]);
  const [typing, setTyping] = useState(false);

  const { currentChatId, chats } = useChatSession();
  const activeChat = chats.find((c) => c.id === currentChatId);

  // Load available models
  useEffect(() => {
    listLLMs()
      .then((list) => {
        setAvailableModels(list);
      })
      .catch(console.error);
  }, []);

  // Handle model selection per chat
  useEffect(() => {
    if (!availableModels.length || !currentChatId) return;

    const exists = (id) => !!id && availableModels.some((m) => m.id === id);
    const saved = getChatModel(currentChatId);
    const isNewChat = !saved;

    if (isNewChat) {
      const pick =
        (exists(defaultModel) && defaultModel) || availableModels[0]?.id;
      if (pick) {
        setModel(pick);
        saveChatModel(currentChatId, pick);
      }
    } else {
      const pick = exists(saved)
        ? saved
        : (exists(defaultModel) && defaultModel) || availableModels[0]?.id;

      if (pick) {
        setModel(pick);
        if (pick !== saved) saveChatModel(currentChatId, pick);
      }
    }
  }, [currentChatId, availableModels, defaultModel]);

  // Load knowledge bases
  // useEffect(() => {
  //   listKnowledgeBases()
  //     .then((all) => {
  //       setKbs(all);

  //       const isNewChat = activeChat?.title === "New Chat";
  //       if (!isNewChat) {
  //         const ids = loadPersistedKBs();
  //         if (ids.length) {
  //           setSelectedKbs(reconcileKBs(ids, all));
  //         }
  //       } else {
  //         setSelectedKbs([]);
  //       }
  //     })
  //     .catch((err) => console.error("❌ Failed to load KBs:", err));
  // }, [activeChat?.id]);

  // Clear KBs for new chats
  useEffect(() => {
    if (activeChat?.title === "New Chat") {
      setSelectedKbs([]);
      localStorage.removeItem(KB_STORAGE_KEY);
    }
  }, [activeChat?.title]);

  // Persist KB selection
  useEffect(() => {
    if (selectedKbs?.length) {
      persistKBs(selectedKbs);
    } else {
      localStorage.removeItem(KB_STORAGE_KEY);
    }
  }, [selectedKbs]);

  return {
    chatMode,
    setChatMode,
    message,
    setMessage,
    sending,
    setSending,
    showSettings,
    setShowSettings,
    kbs,
    selectedKbs,
    setSelectedKbs,
    model,
    setModel,
    missingApiKey,
    setMissingApiKey,
    streaming,
    setStreaming,
    maxTokens,
    setMaxTokens,
    temperature,
    setTemperature,
    topK,
    setTopK,
    threshold,
    setThreshold,
    activePreset,
    setActivePreset,
    availableModels,
    attachments,
    setAttachments,
    typing,
    setTyping,
  };
};

// Helper functions
const KB_STORAGE_KEY = "selectedKbs.v1";

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

const reconcileKBs = (ids, allKbs) => {
  const byId = new Map(allKbs.map((k) => [k.id, k]));
  return ids.map((id) => byId.get(id)).filter(Boolean);
};
