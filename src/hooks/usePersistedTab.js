// src/hooks/usePersistedTab.js
import { useState, useCallback } from "react";
import { STORAGE } from "../utils/persist";

export function usePersistedTab(defaultTab = "summary") {
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem(STORAGE.ACTIVE_TAB) || defaultTab;
  });

  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
    localStorage.setItem(STORAGE.ACTIVE_TAB, tab);
  }, []);

  return {
    activeTab,
    setActiveTab: handleTabChange,
  };
}
