// export const API_ROOT = (window.API_BASE_URL || "").replace(/\/$/, "");
// export const API_VERSION = window.API_VERSION || "/v1"; // let HTML set it too
// export const API_BASE_URL = `${API_ROOT}${API_VERSION}`; // still what most code uses

export const API_ROOT = "http://localhost:8002"; // ← Set backend address directly
export const API_VERSION = "/v1"; // Or "" if no prefix
export const API_BASE_URL = `${API_ROOT}${API_VERSION}`;
