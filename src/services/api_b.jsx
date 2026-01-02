// src/services/api.js

import { API_BASE_URL } from "./config.js";

/** Prefix for every auth-related endpoint (matches `app.include_router(auth_router, prefix="/auth")`) */
const AUTH = "/auth";

class APIService {
  constructor() {
    this.token = localStorage.getItem("token") ?? null;
    this.currentUser = null;
  }

  /* ------------------------------------------------------------------ */
  /* Helpers                                                            */
  /* ------------------------------------------------------------------ */
  _headers(json = true) {
    const h = {};
    if (json) h["Content-Type"] = "application/json";
    if (this.token) h["Authorization"] = `Bearer ${this.token}`;
    return h;
  }

  async _safeFetch(url, opts = {}) {
    const resp = await fetch(url, opts);
    if (resp.ok) return resp;
    // try to extract helpful text
    let msg = `HTTP ${resp.status}`;
    try {
      const data = await resp.json();
      if (typeof data.detail === "string") msg = data.detail;
      else if (Array.isArray(data.detail)) {
        msg = data.detail.map((d) => d.msg).join("; ");
      }
    } catch {
      /* ignore */
    }
    if (resp.status === 401) {
      // JWT expired / invalid
      this.logout();
      window.dispatchEvent(new Event("unauthorized"));
    }
    throw new Error(msg);
  }

  /* ------------------------------------------------------------------ */
  /* Auth                                                               */
  /* ------------------------------------------------------------------ */
  async register(payload) {
    const resp = await this._safeFetch(`${API_BASE_URL}${AUTH}/register`, {
      method: "POST",
      headers: this._headers(),
      body: JSON.stringify(payload),
    });
    return resp.json();
  }

  async login(username, password) {
    const body = new URLSearchParams({ username, password });
    const resp = await this._safeFetch(`${API_BASE_URL}${AUTH}/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const { access_token } = await resp.json();
    this.token = access_token;
    localStorage.setItem("token", access_token);

    this.currentUser = await this.getCurrentUser();
  }

  logout() {
    this.token = null;
    localStorage.removeItem("token");
  }

  async getCurrentUser() {
    const resp = await this._safeFetch(`${API_BASE_URL}${AUTH}/users/me`, {
      headers: this._headers(false),
    });
    return resp.json(); // {id, username, email, credits…}
  }

  /* ------------------------------------------------------------------ */
  /* Document & folder operations                                       */
  /* ------------------------------------------------------------------ */
  async createFolder(name, parentId = null) {
    const resp = await this._safeFetch(`${API_BASE_URL}/folders`, {
      method: "POST",
      headers: this._headers(),
      body: JSON.stringify({ name, parent_id: parentId }),
    });
    return resp.json();
  }

  async listTree() {
    const resp = await this._safeFetch(`${API_BASE_URL}/folders/tree`, {
      headers: this._headers(false),
    });
    return resp.json();
  }

  async uploadToFolder(folderId, formData, onProgress) {
    return new Promise((resolve, reject) => {
      const url = folderId
        ? `${API_BASE_URL}/folders/${folderId}/upload`
        : `${API_BASE_URL}/folders/upload`;

      const xhr = new XMLHttpRequest();
      xhr.open("POST", url);
      if (this.token)
        xhr.setRequestHeader("Authorization", `Bearer ${this.token}`);

      xhr.upload.onprogress = (e) => {
        // if (onProgress && e.lengthComputable) onProgress(e.loaded, e.total);
        if (onProgress) onProgress(e.loaded, e.total, e.lengthComputable);
      };
      xhr.onload = () =>
        xhr.status >= 200 && xhr.status < 300
          ? resolve(JSON.parse(xhr.responseText || "{}"))
          : reject(new Error(`Upload failed – HTTP ${xhr.status}`));
      xhr.onerror = () => reject(new Error("Network error while uploading"));

      xhr.send(formData);
    });
  }

  /* ------------------------------------------------------------------ */
  /* Cross-check + database                                             */
  /* ------------------------------------------------------------------ */
  async crossCheck(payload) {
    const resp = await this._safeFetch(`${API_BASE_URL}/cross-check`, {
      method: "POST",
      headers: this._headers(),
      body: JSON.stringify(payload),
    });
    return resp.json();
  }

  async getDatabaseRecords() {
    const resp = await this._safeFetch(`${API_BASE_URL}/records`, {
      headers: this._headers(false),
    });
    // return resp.json();

    const data = await resp.json(); // could be array or object
    if (Array.isArray(data)) {
      return { success: true, records: data };
    }
    if ("records" in data) {
      return { success: true, records: data.records };
    }
    return { success: false };
  }

  async deleteDatabaseRecord(id) {
    await this._safeFetch(`${API_BASE_URL}/records/${id}`, {
      method: "DELETE",
      headers: this._headers(false),
    });
  }

  async deleteAllDatabaseRecords() {
    await this._safeFetch(`${API_BASE_URL}/records`, {
      method: "DELETE",
      headers: this._headers(false),
    });
  }

  async downloadCsv() {
    const resp = await this._safeFetch(`${API_BASE_URL}/download-database`, {
      headers: this._headers(false),
    });
    return resp.blob();
  }

  /* ------------------------------------------------------------------ */
  /* Arbitrary helpers                                                  */
  /* ------------------------------------------------------------------ */
  async setApiKey(apiKey) {
    const body = new URLSearchParams({ api_key: apiKey });
    const resp = await this._safeFetch(`${API_BASE_URL}/set-api-key`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    return resp.json();
  }

  async updateDatabase(payload) {
    const userId = this.currentUser?.id ?? (await this.getCurrentUser()).id;
    let body, headers;
    if (payload instanceof FormData) {
      /* FormData → let the browser set multipart/form-data;boundary */
      payload.append("user_id", userId);
      body = payload;
      headers = this._headers(false); // adds JWT, no content-type
    } else {
      /* Plain object → send as x-www-form-urlencoded */
      payload.user_id = userId;
      body = new URLSearchParams(payload);
      headers = { "Content-Type": "application/x-www-form-urlencoded" };
    }

    const resp = await this._safeFetch(`${API_BASE_URL}/update-database`, {
      method: "POST",
      headers,
      body,
    });
    return resp.json();
  }

  /* File / Folder delete (used by UI controller) */
  async deleteItem(id, type) {
    const url =
      type === "file"
        ? `${API_BASE_URL}/folders/file/${id}`
        : `${API_BASE_URL}/folders/${id}`;
    await this._safeFetch(url, {
      method: "DELETE",
      headers: this._headers(false),
    });
  }
}

export const api = new APIService();