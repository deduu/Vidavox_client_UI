// hooks/useChatActions.js
import { useCallback, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import {
  sendChatMessage,
  chatDirect,
  chatDirectStream,
  uploadAttachment,
  sendChatMessageStream,
} from "../services/api";
import { useChatSession } from "../contexts/ChatSessionContext";

let abortController = null;

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
    const imageUrls = uploaded
      .filter((a) => isImageType(a.meta?.mime || a.meta?.type || a.file?.type))
      .map((a) => a.meta.url);
    const fileUrls = uploaded
      .filter((a) => a.meta?.type !== "image")
      .map((a) => a.meta.url);
    const isVision = imageUrls.length > 0;

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
    const baseHistory = [...history, userMsg];
    setMessage("");

    // Clean up attachment previews
    setAttachments((prev) => {
      prev.forEach((a) => {
        if (a.displayUrl?.startsWith("blob:")) {
          console.log("🧹 revoking composer blob preview", a.displayUrl);
        }
      });
      return [];
    });

    setSending(true);

    try {
      if (selectedKbs.length > 0) {
        await handleKnowledgeBaseChat(userMsg, sessionId, signal);
      } else {
        await handleDirectChat(
          userMsg,
          sessionId,
          imageUrls,
          fileUrls,
          isVision,
          signal
        );
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
  const handleKnowledgeBaseChat = async (userMsg, sessionId, signal) => {
    const allFileIds = selectedKbs.flatMap((kb) => kb.files.map((f) => f.id));
    console.log("🔍 Using KBs:", allFileIds);

    setTyping(true);

    // payload shared by both streaming / non-streaming
    const payload = {
      message: userMsg.content,
      knowledgeBaseFileIds: allFileIds,
      topK,
      threshold,
      session_id: sessionId,
      signal: signal,
    };

    // if streaming mode is enabled (same logic as direct chat)
    if (streaming) {
      let gotFirst = false;
      let assistantMsg = {
        role: "assistant",
        content: "",
        citations: [],
        chunks: [],
      };

      for await (const token of sendChatMessageStream(payload)) {
        if (typeof token === "string") {
          // streaming partial text
          if (!gotFirst) {
            gotFirst = true;
            setTyping(false);
            assistantMsg = {
              role: "assistant",
              content: token,
              citations: [],
              chunks: [],
            };
            setHistory((prev) => [...prev, assistantMsg]);
          } else {
            assistantMsg.content += token;
            setHistory((prev) => {
              const copy = [...prev];
              copy[copy.length - 1] = { ...assistantMsg };
              return copy;
            });
          }
        } else if (token && typeof token === "object") {
          // final object
          assistantMsg.content = token.answer || assistantMsg.content;
          assistantMsg.citations = token.citations || [];
          assistantMsg.chunks = token.used_chunks || [];
          setHistory((prev) => {
            const copy = [...prev];
            copy[copy.length - 1] = { ...assistantMsg };
            return copy;
          });
        }

        if (isAtBottomRef.current) {
          scrollToBottom();
        }
      }

      await maybeAutoRenameChat(userMsg);
      await sendChatMessageToBackend(assistantMsg);
    } else {
      // fallback: non-streaming
      const res = await sendChatMessage(payload);

      const assistantMsg = {
        role: "assistant",
        content: res.response.answer,
        citations: res.response.citations || [],
        chunks: res.response.used_chunks || [],
      };

      await maybeAutoRenameChat(userMsg);
      await sendChatMessageToBackend(assistantMsg);
      setTyping(false);
    }
  };

  // const handleKnowledgeBaseChat = async (userMsg, sessionId, signal) => {
  //   const allFileIds = selectedKbs.flatMap((kb) => kb.files.map((f) => f.id));

  //   console.log("🔍 Using KBs:", allFileIds);
  //   setTyping(true);

  //   const res = await sendChatMessage({
  //     message: userMsg.content,
  //     knowledgeBaseFileIds: allFileIds,
  //     topK,
  //     threshold,
  //     session_id: sessionId,
  //     signal: signal,
  //   });

  //   const assistantMsg = {
  //     role: "assistant",
  //     content: res.response.answer,
  //     citations: res.response.citations || [],
  //     chunks: res.response.used_chunks || [],
  //   };

  //   await maybeAutoRenameChat(userMsg);
  //   await sendChatMessageToBackend(assistantMsg);
  //   setTyping(false);
  // };

  const handleDirectChat = async (
    userMsg,
    sessionId,
    imageUrls,
    fileUrls,
    isVision,
    signal
  ) => {
    await maybeAutoRenameChat(userMsg);
    const mustStream = streaming && !isVision;

    const payload = {
      model,
      messages: [{ role: "user", content: userMsg.content }],
      max_tokens: maxTokens,
      temperature,
      attached_image_urls: imageUrls,
      attached_file_urls: fileUrls,
      session_id: sessionId,
      signal: signal,
    };

    if (mustStream) {
      await handleStreamingResponse(payload);
    } else {
      await handleNonStreamingResponse(payload);
    }
  };

  const handleStreamingResponse = async (payload) => {
    setTyping(true);
    let gotFirst = false;
    let assistantMsg = { role: "assistant", content: "" };

    for await (const token of chatDirectStream(payload)) {
      if (!gotFirst) {
        gotFirst = true;
        setTyping(false);
        assistantMsg = { role: "assistant", content: token };
        // Update history with streaming message
        setHistory((prev) => [...prev, assistantMsg]);
      } else {
        assistantMsg.content += token;

        // Update streaming content
        setHistory((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = { ...assistantMsg };
          return copy;
        });
      }

      // Auto-scroll if at bottom
      if (isAtBottomRef.current) {
        console.log("⬇️ Auto-scrolling token because user is at bottom");
        scrollToBottom();
      } else {
        console.log("⛔ Not auto-scrolling — user scrolled up");
      }
    }

    await sendChatMessageToBackend(assistantMsg);
  };

  const handleNonStreamingResponse = async (payload) => {
    setTyping(true);
    const reply = await chatDirect(payload);
    const assistantMsg = {
      role: "assistant",
      content: reply.text,
    };

    await sendChatMessageToBackend(assistantMsg);
    setTyping(false);
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

  const handleSendFileOnly = useCallback(
    async (file) => {
      const uploaded = attachments.find(
        (a) =>
          a.file?.name === file.name && a.meta?.url && !a.uploading && !a.error
      );
      if (!uploaded) return;

      // Implementation similar to handleSend but for file-only
      // ... (implementation details)

      const sessionId = currentChatId || "default";
      const imageUrls = uploaded
        .filter((a) =>
          isImageType(a.meta?.mime || a.meta?.type || a.file?.type)
        )
        .map((a) => a.meta.url);
      const fileUrls = uploaded
        .filter((a) => a.meta?.type !== "image")
        .map((a) => a.meta.url);
      const isVision = imageUrls.length > 0;

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
        // in ChatPage.jsx where you clear the composer chips
        setAttachments((prev) => {
          prev.forEach((a) => {
            if (a.displayUrl?.startsWith("blob:")) {
              +console.log("🧹 revoking composer blob preview", a.displayUrl, {
                name: a.file?.name,
              });
              URL.revokeObjectURL(a.displayUrl);
            } else if (a.displayUrl) {
              console.warn(
                "⚠️ displayUrl is not a blob, not revoking",
                a.displayUrl
              );
            }
          });
          return [];
        });
      }
    },
    [
      attachments,
      currentChatId,
      message,
      model,
      maxTokens,
      temperature,
      setHistory,
      setAttachments,
    ]
  );

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

  const handleTopKChange = useCallback();
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
    [threshold, setTopK, setActivePreset];

  const handleThresholdChange = useCallback();
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
    [topK, setThreshold, setActivePreset];

  return {
    handleSend,
    handleSendFileOnly,
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
