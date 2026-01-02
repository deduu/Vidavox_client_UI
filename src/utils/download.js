// src/utils/download.js
export function downloadFile(content, filename, mimeType = "text/plain") {
  try {
    const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;
    link.click();

    // Clean up
    URL.revokeObjectURL(url);
    return true;
  } catch (error) {
    console.error("Download failed:", error);
    return false;
  }
}
