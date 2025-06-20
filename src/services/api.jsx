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

  // files could be FileList or array
  Array.from(files).forEach((file) => {
    // 'files' must match your FastAPI param name
    form.append("files", file);
  });

  const res = await fetch(`${API_URL}/folders/${folderId}/upload`, {
    method: "POST",
    headers: authHeader(), // do NOT set Content-Type
    body: form,
  });

  if (!res.ok && res.status !== 207) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.detail || `Upload failed: ${res.status}`);
  }
  const payload = await res.json();
  if (payload.failed_files?.length) {
    alert(`${payload.failed_files.length} files failed`);
  }
  return payload;
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
