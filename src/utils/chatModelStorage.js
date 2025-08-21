// src/utils/chatModelStorage.js
const KEY = "chatModels.v1";

const read = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
};
const write = (obj) => localStorage.setItem(KEY, JSON.stringify(obj));

export const getChatModel = (chatId) => read()[chatId] ?? null;

export const saveChatModel = (chatId, modelId) => {
  const m = read();
  m[chatId] = modelId;
  write(m);
};

export const cleanupChatModel = (chatId) => {
  const m = read();
  if (chatId in m) {
    delete m[chatId];
    write(m);
  }
};

// Optional: keep storage tidy if sessions are removed elsewhere
export const cleanupMissing = (existingIds) => {
  const keep = new Set(existingIds);
  const m = read();
  let changed = false;
  for (const id of Object.keys(m)) {
    if (!keep.has(id)) {
      delete m[id];
      changed = true;
    }
  }
  if (changed) write(m);
};

// Optional: nuke everything
export const clearAllChatModels = () => localStorage.removeItem(KEY);
