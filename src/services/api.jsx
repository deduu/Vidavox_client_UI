export const API_URL =
  import.meta.env.BACKEND_URL || "http://localhost:8002/v1";

function authHeader() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function register(user) {
  const res = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(user),
  });
  const data = await res.json();
  if (!res.ok) {
    // Throw so AuthContext.register won't call login()
    throw new Error(data.detail || "Registration failed");
  }
  return data;
}

export async function verifyEmail(token) {
  // adjust "/auth/verify-email" vs "/verify-email" to match your router prefix
  const res = await fetch(
    `${API_URL}/auth/verify-email?token=${encodeURIComponent(token)}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.detail || "Email verification failed");
    err.status = res.status;
    throw err;
  }
  return data;
}

export async function checkEmail(email) {
  const res = await fetch(
    `${API_URL}/auth/check/email?email=${encodeURIComponent(email)}`
  );
  if (!res.ok) throw new Error("Network error");
  return res.json(); // { exists: boolean }
}

export async function checkUsername(username) {
  const res = await fetch(
    `${API_URL}/auth/check/username?username=${encodeURIComponent(username)}`
  );
  if (!res.ok) throw new Error("Network error");
  return res.json(); // { exists: boolean }
}

export async function login(creds) {
  // creds should be an object { username: '…', password: '…' }
  const form = new URLSearchParams();
  form.append("username", creds.username);
  form.append("password", creds.password);
  // grant_type is required by OAuth2PasswordRequestForm – default is 'password'
  form.append("grant_type", "password");

  const res = await fetch(`${API_URL}/auth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form.toString(),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Login failed: ${err.detail || res.statusText}`);
  }

  return res.json();
}

export async function resendVerification(body) {
  const res = await fetch(`${API_URL}/auth/resend-verification`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeader(),
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || "Failed to resend verification");
  }
  return data;
}

export async function fetchCurrentUser() {
  const res = await fetch(`${API_URL}/auth/users/me`, {
    headers: authHeader(),
  });
  return res.json();
}

// src/services/api.js
export async function fetchUsage(period = "monthly") {
  const res = await fetch(`${API_URL}/auth/users/me/usage?period=${period}`, {
    headers: authHeader(),
  });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.detail || "Failed to fetch usage");
    err.status = res.status;
    throw err;
  }
  return data;
}

// export async function fetchUsage(userId) {
//   const res = await fetch(`${API_URL}/admin/user/${userId}/usage`, {
//     headers: authHeader(),
//   });
//   return res.json();
// }

// Folder & file
export async function fetchFolderTree() {
  const res = await fetch(`${API_URL}/folders/tree`, {
    headers: authHeader(),
  });
  return res.json();
}

export async function createFolder(name, parentId = null) {
  const res = await fetch(`${API_URL}/folders/`, {
    method: "POST",
    headers: {
      ...authHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name, parent_id: parentId }),
  });
  return res.json();
}

export async function deleteFolder(id) {
  await fetch(`${API_URL}/folders/${id}`, {
    method: "DELETE",
    headers: authHeader(),
  });
}

export async function deleteFile(id) {
  await fetch(`${API_URL}/folders/file/${id}`, {
    method: "DELETE",
    headers: authHeader(),
  });
}

// services/api.js
export async function uploadFiles(files, folderId) {
  const form = new FormData();
  Array.from(files).forEach((file) => form.append("files", file));

  const res = await fetch(`${API_URL}/folders/${folderId}/upload`, {
    method: "POST",
    headers: authHeader(),
    body: form,
  });

  // hard failures (4xx/5xx except 207)
  if (!res.ok && res.status !== 207) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.detail || `Upload failed: ${res.status}`);
  }

  const payload = await res.json();

  if (payload.failed_files?.length) {
    // --- Handle either shape -----------------------------------------
    const failedList = payload.failed_files
      .map((item) => {
        // tuple? → item[0] is path; object? → item.name
        const fileName =
          typeof item === "string"
            ? item.split(/[\\/]/).pop()
            : Array.isArray(item)
            ? item[0].split(/[\\/]/).pop()
            : item.name;

        // optional: include the reason in parentheses
        const reason = Array.isArray(item)
          ? item[1]
          : typeof item === "object"
          ? item.reason
          : "";

        return `• ${fileName}${reason ? " – " + reason : ""}`;
      })
      .join("\n");

    alert(`Some files failed:\n${failedList}`);
  }

  return payload;
}

export async function listKnowledgeBases() {
  const res = await fetch(`${API_URL}/knowledge_bases`, {
    headers: {
      ...authHeader(),
    },
  });
  const data = await res.json();
  if (!res.ok)
    throw new Error(data.detail || "Failed to fetch knowledge bases");
  return data;
}

export async function createKnowledgeBase(name, fileIds) {
  const form = new FormData();
  form.append("name", name);
  fileIds.forEach((id) => form.append("file_ids", id));
  const res = await fetch(`${API_URL}/knowledge_bases`, {
    method: "POST",
    headers: {
      ...authHeader(),
    },
    body: form,
  });
  const data = await res.json();
  if (!res.ok)
    throw new Error(data.detail || "Failed to create knowledge base");
  return data;
}

export async function updateKnowledgeBase(kbId, data) {
  const res = await fetch(`${API_URL}/knowledge_bases/${kbId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...authHeader(),
    },
    body: JSON.stringify(data),
  });
  const response = await res.json();
  if (!res.ok)
    throw new Error(response.detail || "Failed to update knowledge base");
  return response;
}

export async function deleteKnowledgeBase(kbId) {
  const res = await fetch(`${API_URL}/knowledge_bases/${kbId}`, {
    method: "DELETE",
    headers: authHeader(),
  });
  const data = await res.json();
  if (!res.ok)
    throw new Error(data.detail || "Failed to delete knowledge base");
  return data;
}

export async function sendChatMessage({ message, knowledgeBaseFileIds }) {
  const form = new FormData();
  form.append("query", message);
  form.append("prompt_type", "agentic");
  form.append("search_mode", "hybrid");
  form.append("top_k", 10);
  form.append("threshold", 0.4);
  form.append("prefixes", knowledgeBaseFileIds);

  const res = await fetch(`${API_URL}/analysis/perform_rag`, {
    method: "POST",
    headers: {
      ...authHeader(), // Authorization only; FormData sets its own Content-Type
    },
    body: form,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || "RAG analysis failed");
  }

  return data; // Should be: { answer: string, ... }
}

export async function sendChat({ question, folder_ids, file_ids }) {
  const res = await fetch(`${API_URL}/chat/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeader(),
    },
    body: JSON.stringify({ question, folder_ids, file_ids }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Chat failed");
  return data; // { answer: string }
}

// non-streaming chat
export async function chatDirect({
  model,
  messages,
  max_tokens = 512,
  temperature = 0.8,
}) {
  const payload = { model, messages, max_tokens, temperature, stream: false };
  const res = await fetch(`${API_URL}/chat/chat-direct`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeader(),
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "chat-direct failed");
  // your backend wraps text in { text: answer }
  return data.text;
}

// streaming chat (async-iterator of tokens)
export async function* chatDirectStream({
  model,
  messages,
  max_tokens = 512,
  temperature = 0.8,
}) {
  const payload = { model, messages, max_tokens, temperature, stream: true };
  const res = await fetch(`${API_URL}/chat/chat-direct`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeader(),
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "chat-direct stream failed");
  }

  // Read the text/event-stream
  const reader = res.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buf = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    // SSE-style: lines beginning with "data: "
    const parts = buf.split("\n\n");
    buf = parts.pop(); // leftover
    for (const chunk of parts) {
      if (chunk.startsWith("data:")) {
        const jsonStr = chunk.replace(/^data:\s*/, "");
        try {
          const { text } = JSON.parse(jsonStr);
          yield text;
        } catch {
          // ignore non-JSON ping events
        }
      }
    }
  }
}

// Create chat session
export async function createChatSession() {
  const res = await fetch(`${API_URL}/chat/sessions`, {
    method: "POST",
    headers: authHeader(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to create chat session");
  return data;
}

// List chat sessions
export async function listChatSessions() {
  const res = await fetch(`${API_URL}/chat/sessions`, {
    headers: authHeader(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to fetch sessions");
  return data;
}

// Delete chat session
export async function deleteChatSession(sessionId) {
  const res = await fetch(`${API_URL}/chat/sessions/${sessionId}`, {
    method: "DELETE",
    headers: authHeader(),
  });
  if (!res.ok && res.status !== 204)
    throw new Error("Failed to delete session");
}

// Rename chat session
export async function renameChatSession(sessionId, title) {
  const res = await fetch(
    `${API_URL}/chat/sessions/${sessionId}?title=${encodeURIComponent(title)}`,
    {
      method: "PUT",
      headers: authHeader(),
    }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to rename session");
  return data;
}

// Add message to chat session
export async function addChatMessage(sessionId, messageObj) {
  console.debug("📤 addChatMessage payload:", {
    sessionId,
    messageObj,
  });

  const res = await fetch(`${API_URL}/chat/sessions/${sessionId}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeader(),
    },
    body: JSON.stringify(messageObj),
  });

  const text = await res.text(); // ← safer than res.json() directly

  try {
    const data = JSON.parse(text);

    if (!res.ok) {
      console.error("❌ addChatMessage failed:", data);
      throw new Error(data.detail || JSON.stringify(data));
    }

    return data;
  } catch (e) {
    console.error("❌ Failed to parse error response:", text);
    throw new Error(`Non-JSON error response: ${text}`);
  }
}

// Get messages from session
export async function getChatMessages(sessionId) {
  const res = await fetch(`${API_URL}/chat/sessions/${sessionId}/messages`, {
    headers: authHeader(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to fetch messages");
  return data;
}

// Delete all messages from session
export async function deleteChatMessages(sessionId) {
  const res = await fetch(`${API_URL}/chat/sessions/${sessionId}/messages`, {
    method: "DELETE",
    headers: authHeader(),
  });
  if (!res.ok && res.status !== 204)
    throw new Error("Failed to delete messages");
}

// services/api.js (or wherever you keep helpers)
export async function listLLMs() {
  const res = await fetch(`${API_URL}/llm/list`, {
    headers: { "Content-Type": "application/json", ...authHeader() },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to load LLM list");
  return data;
}
