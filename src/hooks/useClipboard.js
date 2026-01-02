// src/hooks/useClipboard.js
import { useCallback } from "react";

export function useClipboard() {
  const copyToClipboard = useCallback(
    async (text, successMessage = "Copied!") => {
      try {
        if (!navigator.clipboard) {
          throw new Error("Clipboard API not available");
        }

        await navigator.clipboard.writeText(text || "");

        // You should replace this with your toast/notification system
        alert(successMessage);
        return true;
      } catch (error) {
        console.error("Clipboard copy failed:", error);
        alert("Copy failed. Please try again.");
        return false;
      }
    },
    []
  );

  return { copyToClipboard };
}
