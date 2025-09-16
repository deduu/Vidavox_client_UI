// src/hooks/useTreeData.js
import { useState, useEffect } from "react";
import { fetchFolderTree } from "../services/api";

export const useTreeData = (showNotification) => {
  const [tree, setTree] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadTree = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchFolderTree();
      setTree(data);
    } catch (err) {
      console.error("Failed to load folder tree", err);
      setError(err);
      showNotification?.(
        "error",
        "Failed to load your files. Please refresh the page."
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTree();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { tree, loadTree, isLoading, error };
};
