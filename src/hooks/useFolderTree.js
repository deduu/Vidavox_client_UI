// src/hooks/useFolderTree.js
import { useState, useEffect } from "react";
import { fetchFolderTree } from "../services/api";

function normalizeTreeData(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.folders)) return data.folders;
  if (data && typeof data === "object") return [data];
  return [];
}

export function useFolderTree() {
  const [tree, setTree] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const loadTree = async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await fetchFolderTree();

        if (cancelled) return;

        const normalized = normalizeTreeData(data);
        setTree(normalized);
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to load folder tree:", err);
          setError(err);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadTree();

    return () => {
      cancelled = true;
    };
  }, []);

  return { tree, loading, error };
}
