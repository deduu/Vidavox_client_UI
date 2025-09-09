// hooks/useChatMessages.js
import { useState, useEffect } from "react";
import { useChatSession } from "../contexts/ChatSessionContext";

export const useChatMessages = () => {
  const [history, setHistory] = useState([]);

  const { chats, currentChatId, loadMessagesForCurrentChat, messagesMap } =
    useChatSession();

  const activeChat = chats.find((c) => c.id === currentChatId);

  // Load messages when chat changes
  useEffect(() => {
    if (!currentChatId) return;

    (async () => {
      const msgs = await loadMessagesForCurrentChat();
      setHistory(msgs);
    })();
  }, [currentChatId, messagesMap, loadMessagesForCurrentChat]);

  return {
    history,
    setHistory,
    currentChatId,
    activeChat,
  };
};
