// src/utils/persist.js

// ---- File <-> dataURL helpers ----
export function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result); // data URL
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });
}

export async function dataURLToFile(dataURL, suggestedName = "upload.bin") {
  // Turn dataURL -> Blob -> File (keeps mime type)
  const res = await fetch(dataURL);
  const blob = await res.blob();
  const nameFromMime = blob.type?.split("/")[1] || "bin";
  const name =
    suggestedName && suggestedName.includes(".")
      ? suggestedName
      : `upload.${nameFromMime}`;
  return new File([blob], name, { type: blob.type });
}

// ---- Storage keys ----
export const STORAGE = {
  ACTIVE_TAB: "unidoc_active_tab",
  PAGE_VIEWER: "extracted_page_viewer",
  SELECTED_FILE: "unidoc_selected_file", // <-- use localStorage now
  EXTRACTION_JOB: "unidoc_extraction_job", // <-- new, keep consistent
  EXTRACTION_RESULT: "unidoc_extraction_result",
  MARKDOWN_TEXT: "unidoc_md",
  JSON_TEXT: "unidoc_json",
  EXTRACTION_PROGRESS: "unidoc_extraction_progress",
};

// ---- Generic helpers ----
export const saveJSON = (key, obj) =>
  localStorage.setItem(key, JSON.stringify(obj));
export const loadJSON = (key, fallback = null) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};
export const saveSessionJSON = (key, obj) =>
  sessionStorage.setItem(key, JSON.stringify(obj));
export const loadSessionJSON = (key, fallback = null) => {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

// Clear everything related to one run (optional hook)
export function clearExtractionPersist() {
  try {
    localStorage.removeItem(STORAGE.EXTRACTION_RESULT);
    localStorage.removeItem(STORAGE.EXTRACTION_JOB);
    localStorage.removeItem(STORAGE.SELECTED_FILE);
    localStorage.removeItem(STORAGE.JSON_TEXT);
    localStorage.removeItem(STORAGE.MARKDOWN_TEXT);
    localStorage.removeItem(STORAGE.EXTRACTION_PROGRESS);
  } catch (e) {
    console.warn("LS cleanup failed:", e);
  }
}
