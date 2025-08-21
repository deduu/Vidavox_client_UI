import { createContext, useContext, useState, useEffect } from "react";
import {
  createChatSession,
  listChatSessions,
  deleteChatSession,
  renameChatSession,
  getChatMessages,
  addChatMessage,
} from "../services/api";
import { cleanupChatModel, cleanupMissing } from "../utils/chatModelStorage";

const ChatSessionContext = createContext();

export function ChatSessionProvider({ children }) {
  const [messagesMap, setMessagesMap] = useState({});

  const [chats, setChats] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);

  // Load sessions on first mount
  useEffect(() => {
    (async () => {
      try {
        // console.log("📥 listChatSessions is running…");
        const sessions = await listChatSessions();
        setChats(sessions);
        cleanupMissing(sessions.map((s) => s.id));
        if (sessions.length) {
          setCurrentChatId(sessions[0].id);
        } else {
          const newSession = await createChatSession();
          setChats([newSession]);
          setCurrentChatId(newSession.id);
        }
      } catch (err) {
        console.error("Failed to load chat sessions:", err);
      }
    })();
  }, []);

  // Create a new session via backend
  const createNewChat = async () => {
    const newSession = await createChatSession();
    setChats((prev) => [newSession, ...prev]);
    setCurrentChatId(newSession.id);
  };

  const deleteChat = async (id) => {
    await deleteChatSession(id);
    cleanupChatModel(id);
    const filtered = chats.filter((c) => c.id !== id);
    setChats(filtered);
    if (id === currentChatId) {
      if (filtered.length) {
        setCurrentChatId(filtered[0].id);
      } else {
        await createNewChat();
      }
    }
  };

  const renameChat = async (id, newTitle) => {
    const updated = await renameChatSession(id, newTitle);
    setChats((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title: updated.title } : c))
    );
  };

  // Fetch messages for current session
  const loadMessagesForCurrentChat = async () => {
    if (!currentChatId) return [];

    // If already cached, return from memory
    if (messagesMap[currentChatId]) {
      return messagesMap[currentChatId].map(hydrateMsg);
    }

    try {
      // const msgs = await getChatMessages(currentChatId);
      const raw = await getChatMessages(currentChatId);
      const msgs = raw.map(hydrateMsg);
      setMessagesMap((prev) => ({ ...prev, [currentChatId]: msgs }));
      return msgs;
    } catch (err) {
      console.error("Failed to fetch messages:", err);
      return [];
    }
  };

  // Add message and update UI
  const sendMessageToCurrentChat = async ({
    role,
    content,
    citations,
    chunks,
    file_url,
    file_name,
    file_type,
    attachments,
  }) => {
    console.log("🔸 addChatMessage payload:", {
      role,
      content,
      file_url,
      file_name,
      file_type,
      attachments,
    });
    if (!currentChatId) return;

    const newMsg = await addChatMessage(currentChatId, {
      role,
      content,
      citations: citations ? JSON.stringify(citations) : null,
      chunks: chunks ? JSON.stringify(chunks) : null,
      file_url,
      file_name,
      file_type,
      attachments,
    });

    // Update messages map cache
    // setMessagesMap((prev) => ({
    //   ...prev,
    //   [currentChatId]: [...(prev[currentChatId] || []), newMsg],
    // }));

    const hydrated = hydrateMsg(newMsg);
    setMessagesMap((prev) => ({
      ...prev,
      [currentChatId]: [...(prev[currentChatId] || []), hydrated],
    }));

    // Optionally update chat title
    setChats((prev) =>
      prev.map((c) =>
        c.id === currentChatId
          ? {
              ...c,
              title:
                c.title === "New Chat"
                  ? content.slice(0, 40) + (content.length > 40 ? "…" : "")
                  : c.title,
            }
          : c
      )
    );
  };

  return (
    <ChatSessionContext.Provider
      value={{
        chats,
        currentChatId,
        setCurrentChatId,
        createNewChat,
        deleteChat,
        renameChat,
        loadMessagesForCurrentChat,
        sendMessageToCurrentChat,
        messagesMap, // <- expose if components need direct access
      }}
    >
      {children}
    </ChatSessionContext.Provider>
  );
}

export function useChatSession() {
  return useContext(ChatSessionContext);
}

function hydrateMsg(msg) {
  let { citations, chunks } = msg;

  if (typeof citations === "string") {
    try {
      citations = JSON.parse(citations);
    } catch {
      citations = [];
    }
  }
  if (typeof chunks === "string") {
    try {
      chunks = JSON.parse(chunks);
    } catch {
      chunks = [];
    }
  }

  return { ...msg, citations, chunks };
}
