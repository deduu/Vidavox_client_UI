// src/hooks/useExpandedFolders.js
import { useState, useEffect } from "react";

export const useExpandedFolders = () => {
  const [expandedFolders, setExpandedFolders] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("expandedFolders")) || [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem("expandedFolders", JSON.stringify(expandedFolders));
  }, [expandedFolders]);

  return { expandedFolders, setExpandedFolders };
};
