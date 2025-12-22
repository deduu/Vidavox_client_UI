// export const API_URL = "http://35.186.159.2/v1";
// src/services/api.js (top)
const isLocal = ["localhost", "127.0.0.1"].includes(window.location.hostname);
import { API_BASE_URL } from "../config";
export const API_URL =
  // allow override via env (e.g., staging)
  (import.meta?.env?.VITE_API_BASE_URL &&
    import.meta.env.VITE_API_BASE_URL.replace(/\/$/, "")) ||
  // dev fallback
  (isLocal ? "http://localhost:8005/v1" : "/v1"); // prod uses same-origin over HTTPS

function authHeader() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}
// --- helpers ---
// Append an array as repeated form fields: key[]=a & key[]=b
function appendList(fd, key, arr) {
  if (!arr || !arr.length) return;
  for (const v of arr) fd.append(key, v);
}

// Compact debug logger
function logChat(stage, payload) {
  try {
    window.__lastChatDirect = window.__lastChatDirect || {};
    window.__lastChatDirect[stage] = payload;
    console.groupCollapsed(`🛰 chatDirect ${stage}`);
    console.log(payload);
    console.groupEnd();
  } catch {}
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
  console.log("Backend URL:", import.meta.env.VITE_BACKEND_URL);
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

export async function sendPasswordReset(email) {
  const res = await fetch(`${API_URL}/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!res.ok)
    throw new Error((await res.json()).detail || "Failed to request reset");
  return res.json();
}

export async function resetPassword({ token, new_password }) {
  const res = await fetch(`${API_URL}/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, new_password }),
  });
  if (!res.ok)
    throw new Error((await res.json()).detail || "Failed to reset password");
  return res.json();
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
export async function uploadAttachment(file, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append("file", file);

    xhr.open("POST", `${API_URL}/folders/upload`, true); // <-- Adjust backend path
    xhr.setRequestHeader(
      "Authorization",
      `Bearer ${localStorage.getItem("token") || ""}`
    );

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && typeof onProgress === "function") {
        const percent = Math.round((event.loaded / event.total) * 100);
        onProgress(percent);
      }
    };

    xhr.onload = () => {
      try {
        const res = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(res); // { url, type, filename, ... }
        } else {
          reject(new Error(res.detail || "Upload failed"));
        }
      } catch (err) {
        reject(err);
      }
    };

    xhr.onerror = () => reject(new Error("Network error"));
    xhr.send(formData);
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

export async function updateKnowledgeBase(kbId, name, fileIds) {
  const res = await fetch(`${API_URL}/knowledge_bases/${kbId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...authHeader(),
    },
    body: JSON.stringify({ name, file_ids: fileIds }),
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

export async function sendChatMessage({
  message,
  knowledgeBaseFileIds,
  topK,
  threshold,
  file,
  session_id,
  signal,
}) {
  const form = new FormData();
  form.append("query", message);
  form.append("prompt_type", "agentic");
  form.append("search_mode", "hybrid");
  form.append("top_k", topK);
  form.append("threshold", threshold);
  form.append("session_id", session_id);

  // ✅ Append each prefix (fileId) individually
  for (const fileId of knowledgeBaseFileIds) {
    form.append("prefixes", fileId); // not just once as a comma-separated string
  }

  if (file) {
    form.append("file", file); // Append the actual File object
  }

  const res = await fetch(`${API_URL}/analysis/perform_rag`, {
    method: "POST",
    headers: {
      ...authHeader(), // Authorization only; FormData sets its own Content-Type
    },
    body: form,
    signal,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || "RAG analysis failed");
  }

  return data; // Should be: { answer: string, ... }
}

export async function* sendChatMessageStream({
  message,
  knowledgeBaseFileIds,
  topK,
  threshold,
  session_id,
  file,
  signal,
}) {
  const fd = new FormData();
  fd.append("query", message);
  fd.append("prompt_type", "agentic");
  fd.append("search_mode", "hybrid");
  fd.append("top_k", String(topK));
  fd.append("threshold", String(threshold));
  fd.append("session_id", session_id || "default");
  fd.append("stream", "true"); // 👈 important

  for (const fileId of knowledgeBaseFileIds) {
    fd.append("prefixes", fileId);
  }

  if (file) {
    fd.append("file", file);
  }

  const requestInit = {
    method: "POST",
    headers: { ...authHeader() }, // don't set Content-Type manually
    body: fd,
    signal,
  };

  const res = await fetch(`${API_URL}/analysis/perform_rag`, requestInit);

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    let err;
    try {
      err = JSON.parse(errText);
    } catch {
      err = { detail: errText || res.statusText };
    }
    throw new Error(err.detail || "perform_rag stream failed");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buf = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buf += decoder.decode(value, { stream: true });
    const parts = buf.split("\n\n");
    buf = parts.pop() || "";

    for (const chunk of parts) {
      if (!chunk.startsWith("data:")) continue;
      const jsonStr = chunk.replace(/^data:\s*/, "");
      try {
        const parsed = JSON.parse(jsonStr);
        if (parsed.type === "partial") {
          yield parsed.content; // treat as raw text
        } else if (parsed.type === "final") {
          let finalObj;
          try {
            finalObj = JSON.parse(parsed.content);
          } catch {
            finalObj = { answer: parsed.content };
          }
          yield finalObj;
        }
      } catch (e) {
        console.warn("⚠️ Bad SSE chunk:", chunk, e);
      }
    }
  }
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

// --- non-streaming chat ---
// services/api.js
export async function chatDirect({
  model,
  messages, // [{ role, content }]
  max_tokens = 2048,
  temperature = 0.8,
  session_id,
  // NEW preferred: arrays of pre-uploaded URLs
  attached_image_urls = [], // e.g., ["https://cdn/.../img1.png", "https://.../img2.jpg"]
  attached_file_urls = [], // non-image attachments
  // Legacy fallback (still supported): raw File
  file,
  signal,
}) {
  // --- Client-side validation to avoid sending bad payloads ---
  if (
    !Array.isArray(messages) ||
    messages.length === 0 ||
    !messages.every((m) => m && typeof m.role === "string" && "content" in m)
  ) {
    throw new Error("Invalid 'messages' payload (client-side check)");
  }
  const fd = new FormData();
  fd.append("model", model);
  fd.append(
    "messages",
    JSON.stringify(Array.isArray(messages) ? messages : [])
  );

  fd.append("max_tokens", String(max_tokens));
  fd.append("temperature", String(temperature));
  fd.append("stream", "false");
  fd.append("session_id", session_id || "default");

  // arrays → repeated form keys (FastAPI: List[str] = Form([]))
  appendList(fd, "attached_image_urls", attached_image_urls);
  appendList(fd, "attached_file_urls", attached_file_urls);

  // legacy single-file path — keep for backward-compat
  if (file) {
    if (file.type?.startsWith?.("image/")) {
      fd.append("attached_image", file);
    } else {
      fd.append("attached_file", file);
    }
  }

  const requestInit = {
    method: "POST",
    headers: { ...authHeader() }, // don't set Content-Type for FormData
    body: fd,
    signal,
  };

  // logChat("request(non-stream)", {
  //   url: `${API_URL}/chat/chat-direct`,
  //   payloadPreview: {
  //     model,
  //     session_id,
  //     max_tokens,
  //     temperature,
  //     imagesN: attached_image_urls?.length || 0,
  //     filesN: attached_file_urls?.length || 0,
  //     hasLegacyFile: !!file,
  //     // preview first 2 urls to avoid console spam
  //     imageUrls: attached_image_urls?.slice?.(0, 2),
  //     fileUrls: attached_file_urls?.slice?.(0, 2),
  //   },
  // });

  const res = await fetch(`${API_URL}/chat/chat-direct`, requestInit);
  const text = await res.text();

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    // logChat("response-raw(non-stream)", text);
    throw new Error(`chat-direct failed: non-JSON response (${res.status})`);
  }

  // logChat("response(non-stream)", { status: res.status, data });

  if (!res.ok) throw new Error(data?.detail || "chat-direct failed");
  return data;
}

// --- streaming chat (async iterator) ---
// services/api.js
export async function* chatDirectStream({
  model,
  messages,
  max_tokens = 2048,
  temperature = 0.8,
  session_id,
  attached_image_urls = [],
  attached_file_urls = [],
  file, // legacy fallback
  signal,
}) {
  const fd = new FormData();
  fd.append("model", model);
  fd.append("messages", JSON.stringify(messages));
  fd.append("max_tokens", String(max_tokens));
  fd.append("temperature", String(temperature));
  fd.append("stream", "true");
  fd.append("session_id", session_id || "default");

  appendList(fd, "attached_image_urls", attached_image_urls);
  appendList(fd, "attached_file_urls", attached_file_urls);

  if (file) {
    if (file.type?.startsWith?.("image/")) {
      fd.append("attached_image", file);
    } else {
      fd.append("attached_file", file);
    }
  }

  const requestInit = {
    method: "POST",
    headers: { ...authHeader() },
    body: fd,
    signal,
  };

  logChat("request(stream)", {
    url: `${API_URL}/chat/chat-direct`,
    payloadPreview: {
      model,
      session_id,
      max_tokens,
      temperature,
      imagesN: attached_image_urls?.length || 0,
      filesN: attached_file_urls?.length || 0,
      hasLegacyFile: !!file,
      imageUrls: attached_image_urls?.slice?.(0, 2),
      fileUrls: attached_file_urls?.slice?.(0, 2),
    },
  });

  const res = await fetch(`${API_URL}/chat/chat-direct`, requestInit);

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    let err;
    try {
      err = JSON.parse(errText);
    } catch {
      err = { detail: errText || res.statusText };
    }
    logChat("response(stream:error)", { status: res.status, err });
    throw new Error(err.detail || "chat-direct stream failed");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buf = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buf += decoder.decode(value, { stream: true });
    const parts = buf.split("\n\n");
    buf = parts.pop() || "";

    for (const chunk of parts) {
      if (!chunk.startsWith("data:")) continue;
      const jsonStr = chunk.replace(/^data:\s*/, "");
      try {
        const { text } = JSON.parse(jsonStr);
        if (typeof text === "string") {
          yield text;
        }
      } catch (e) {
        // noisy SSE chunk—ignore
      }
    }
  }

  logChat("response(stream:last)", { ended: true });
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
  const res = await fetch(`${API_URL}/list`, {
    headers: { "Content-Type": "application/json", ...authHeader() },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to load LLM list");
  return data;
}

export async function getApiKeys() {
  const res = await fetch(`${API_URL}/profile/me/api-keys`, {
    method: "GET",
    headers: {
      ...authHeader(),
    },
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || "Failed to fetch API keys");
  }
  return await res.json(); // returns a dictionary like { "gpt-4o": "sk-...", ... }
}

export async function updateApiKeys(keys) {
  const res = await fetch(`${API_URL}/profile/me/api-keys`, {
    method: "POST",
    headers: {
      ...authHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ keys }), // { keys: { "gpt-4o": "sk-...", ... } }
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || "Failed to update API keys");
  }

  return await res.json(); // returns { status: "ok", updated_keys: [...] }
}

export async function extractDocument({ file }) {
  const token = localStorage.getItem("token");
  const fd = new FormData();
  fd.append("file", file);
  console.log("api: ", API_BASE_URL);
  const res = await fetch(`${API_BASE_URL}/docparser/extract`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: fd,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.detail || "Extraction failed");

  return {
    message: data.message,
    extraction_result: data.extraction_result,
    json: data.json_output,
    markdown: data.markdown_output,
  };
}

/**
 * Fetch list of jobs
 */
export async function getJobs({ skip = 0, limit = 50 } = {}) {
  const res = await fetch(
    `${API_URL}/docparser/jobs?skip=${skip}&limit=${limit}`,
    { headers: authHeader() }
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.detail || "Failed to fetch jobs");
  return data;
}
/*
 * Delete job
 */
export async function deleteJob(jobId, { complete = false } = {}) {
  const res = await fetch(
    `${API_URL}/docparser/jobs/${jobId}?complete=${complete}`,
    {
      method: "DELETE",
      headers: authHeader(),
    }
  );

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.detail || "Failed to delete job");
  return data;
}

/**
 * Fetch extract summary for a given job
 */
export async function getJobSummary(jobId) {
  const res = await fetch(
    `${API_URL}/docparser/jobs/${jobId}/extract-summary`,
    {
      headers: authHeader(),
    }
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok)
    throw new Error(data?.detail || `Failed to fetch job ${jobId} summary`);
  return data;
}
// export async function extractDocument({ file }) {
//   const token = localStorage.getItem("token");

//   const fd = new FormData();
//   fd.append("file", file); // only what backend expects

//   const res = await fetch(`http://127.0.0.1:8010/api/v1/extractpdf`, {
//     method: "POST",
//     headers: {
//       ...(token ? { Authorization: `Bearer ${token}` } : {}),
//       Accept: "application/json",
//       // DO NOT set Content-Type here; browser will set proper multipart boundary
//     },
//     body: fd,
//   });

//   const data = await res.json().catch(() => ({}));
//   if (!res.ok) {
//     // FastAPI errors typically have {detail: ...}
//     throw new Error(data?.detail || data?.message || "Extraction failed");
//   }

//   // Normalize keys so the rest of your UI can use consistent names if you want:
//   return {
//     message: data.message,
//     extraction_result: data.extraction_result,
//     json: data.json_output, // normalized
//     markdown: data.markdown_output, // normalized
//   };
// }
// export async function extractDocument({ file, options = {}, folderId = null }) {
//   // options: { extract_text, extract_tables, extract_images, page_numbers: number[] }
//   const token = localStorage.getItem("token");

//   const fd = new FormData();
//   fd.append("file", file);
//   fd.append("extract_text", String(!!options.extract_text));
//   fd.append("extract_tables", String(!!options.extract_tables));
//   fd.append("extract_images", String(!!options.extract_images));
//   fd.append("page_numbers", JSON.stringify(options.page_numbers || []));
//   if (folderId) fd.append("folder_id", folderId); // optional: let backend store outputs in that folder

//   const res = await fetch(`${API_URL}/extractpdf`, {
//     method: "POST",
//     headers: {
//       ...(token ? { Authorization: `Bearer ${token}` } : {}),
//       Accept: "application/json",
//     },
//     body: fd,
//   });

//   const data = await res.json().catch(() => ({}));
//   if (!res.ok) {
//     throw new Error(data?.detail || data?.message || "Extraction failed");
//   }
//   return data; // expected to be { meta, json, markdown, pages, ... }
// }
