// hooks/useChatActions.js
import { useCallback, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import {
  uploadAttachment,
  chatCompletions,
  chatCompletionsStream,
} from "../services/api";
import { useChatSession } from "../contexts/ChatSessionContext";

export const useChatActions = ({
  message,
  setMessage,
  sending,
  setSending,
  selectedKbs,
  model,
  maxTokens,
  temperature,
  topK,
  setTopK,
  threshold,
  setThreshold,
  streaming,
  attachments,
  setAttachments,
  typing,
  setTyping,
  history,
  setHistory,
  currentChatId,
  activeChat,
  setMissingApiKey,
  setActivePreset,
  scrollToBottom,
  isAtBottomRef,
}) => {
  const abortControllerRef = useRef(null);
  const { sendMessageToCurrentChat, renameChat } = useChatSession();

  const sendChatMessageToBackend = async (msg) => {
    console.log("🔸 to‑Backend (frontend):", msg);
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
      attachments,
    } = payload;

    await sendMessageToCurrentChat({
      role,
      content,
      citations,
      chunks,
      file,
      file_url,
      file_name,
      file_type,
      attachments,
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

  const addFilesAndUpload = async (files) => {
    const list = Array.from(files);
    const id =
      typeof crypto.randomUUID === "function" ? crypto.randomUUID() : uuidv4();

    const placeholders = list.map((f) => ({
      id: id,
      file: f,
      meta: null,
      progress: 0,
      uploading: true,
      error: null,
      displayUrl: URL.createObjectURL(f),
    }));

    setAttachments((prev) => [...prev, ...placeholders]);

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

  const handleSend = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    const uploaded = attachments.filter((a) => a.meta?.url && !a.uploading);
    const hasAttachment = uploaded.length > 0;

    if (!message.trim() && !hasAttachment) return;

    const sessionId = currentChatId || "default";

    // Build user message with attachments
    const userMsg = {
      role: "user",
      content: message,
      attachments: uploaded.map((a) => ({
        name: a.file?.name,
        mime_type: a.file?.type,
        url: a.meta?.url,
        size_bytes: a.file?.size || null,
        meta: { display_url: a.displayUrl },
      })),
    };

    await sendChatMessageToBackend(userMsg);
    await maybeAutoRenameChat(userMsg);

    setMessage("");

    // Clean up attachment previews
    setAttachments((prev) => {
      prev.forEach((a) => {
        if (a.displayUrl?.startsWith("blob:")) {
          URL.revokeObjectURL(a.displayUrl);
          console.log("🧹 revoking composer blob preview", a.displayUrl);
        }
      });
      return [];
    });

    setSending(true);

    try {
      // Build OpenAI-compatible messages format
      const messages = [
        ...history.map((h) => ({
          role: h.role,
          content: h.content,
        })),
        {
          role: "user",
          content: message,
        },
      ];

      // Prepare payload for /v1/chat/completions
      const payload = {
        model: model || "Auto",
        messages: messages,
        stream: streaming,
        max_tokens: maxTokens,
        temperature: temperature,
        session_id: sessionId,
        // Include KB settings if applicable
        ...(selectedKbs.length > 0 && {
          selected_tools: ["get_vector_context"],
          query_mode: "split_query",
          do_rerank: true,
        }),
        signal: signal,
      };

      if (streaming) {
        await handleStreamingResponse(payload);
      } else {
        await handleNonStreamingResponse(payload);
      }
    } catch (err) {
      await handleChatError(err);
    } finally {
      setSending(false);
    }
  }, [
    message,
    attachments,
    currentChatId,
    history,
    selectedKbs,
    model,
    maxTokens,
    temperature,
    topK,
    threshold,
    streaming,
  ]);

  const handleStreamingResponse = async (payload) => {
    setTyping(true);
    let gotFirst = false;
    let assistantMsg = { role: "assistant", content: "" };

    try {
      for await (const chunk of chatCompletionsStream(payload)) {
        // Parse SSE chunk
        const delta = chunk.choices?.[0]?.delta;
        const content = delta?.content || "";

        if (!content) continue;

        if (!gotFirst) {
          gotFirst = true;
          setTyping(false);
          assistantMsg = { role: "assistant", content: content };
          setHistory((prev) => [...prev, assistantMsg]);
        } else {
          assistantMsg.content += content;
          setHistory((prev) => {
            const copy = [...prev];
            copy[copy.length - 1] = { ...assistantMsg };
            return copy;
          });
        }

        // Auto-scroll if at bottom
        if (isAtBottomRef.current) {
          scrollToBottom();
        }
      }

      await sendChatMessageToBackend(assistantMsg);
    } catch (err) {
      console.error("Streaming error:", err);
      setTyping(false);
      throw err;
    }
  };

  const handleNonStreamingResponse = async (payload) => {
    setTyping(true);

    try {
      const response = await chatCompletions(payload);
      const content = response.choices?.[0]?.message?.content || "";

      const assistantMsg = {
        role: "assistant",
        content: content,
      };

      await sendChatMessageToBackend(assistantMsg);
      setHistory((prev) => [...prev, assistantMsg]);
    } finally {
      setTyping(false);
    }
  };

  const handleChatError = async (err) => {
    console.error("❌ handleSend error:", err);

    const status = err?.response?.status;
    const serverMsg = err?.response?.data?.detail;
    const msg = serverMsg || err?.message || String(err);

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
    }

    setTyping(false);
  };

  const handleStop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      console.log("🛑 Streaming manually aborted.");
    }
  }, []);

  const handlePasteImage = useCallback(async (file) => {
    await addFilesAndUpload([file]);
  }, []);

  const handleAttachFiles = useCallback(async (files) => {
    if (!files || files.length === 0) return;
    await addFilesAndUpload(files);
  }, []);

  const handleRemoveAttachment = useCallback((id) => {
    setAttachments((prev) => {
      const target = prev.find((a) => a.id === id);
      if (target?.displayUrl) URL.revokeObjectURL(target.displayUrl);
      return prev.filter((a) => a.id !== id);
    });
  }, []);

  const handleTopKChange = useCallback(
    (val) => {
      setTopK(val);
      if (
        !(val === 5 && threshold === 0.3) &&
        !(val === 10 && threshold === 0.2) &&
        !(val === 20 && threshold === 0.1)
      ) {
        setActivePreset(null);
      }
    },
    [threshold, setTopK, setActivePreset]
  );

  const handleThresholdChange = useCallback(
    (val) => {
      setThreshold(val);
      if (
        !(topK === 5 && val === 0.3) &&
        !(topK === 10 && val === 0.2) &&
        !(topK === 20 && val === 0.1)
      ) {
        setActivePreset(null);
      }
    },
    [topK, setThreshold, setActivePreset]
  );

  return {
    handleSend,
    handlePasteImage,
    handleAttachFiles,
    handleRemoveAttachment,
    handleStop,
    handleTopKChange,
    handleThresholdChange,
  };
};

// Helper functions
const isImageType = (t) =>
  typeof t === "string" && t.toLowerCase().startsWith("image");

const pickPrimaryAttachment = (atts) => {
  if (!Array.isArray(atts) || !atts.length) return null;
  const isImg = (a) =>
    typeof (a?.mime_type || a?.type) === "string" &&
    (a.mime_type || a.type).toLowerCase().startsWith("image/");
  return atts.find(isImg) || atts[0];
};

const withLegacyFileFields = (msg) => {
  const att = pickPrimaryAttachment(msg.attachments);
  if (!att) return { ...msg };

  const legacyType = att.mime_type || att.type || "";
  const preview = att.meta?.display_url || att.display_url || att.url || null;

  return {
    ...msg,
    attachments: msg.attachments,
    file:
      att.name || legacyType
        ? { name: att.name || "file", type: legacyType }
        : null,
    file_url: preview,
    file_name: att.name || null,
    file_type: legacyType || null,
  };
};
