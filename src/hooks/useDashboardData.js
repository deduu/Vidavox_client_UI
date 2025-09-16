// src/hooks/useDashboardData.js
import { useMemo } from "react";
import { flattenAllNodes } from "../utils/tree";

export const useDashboardData = (tree) => {
  const stats = useMemo(() => {
    const allNodes = flattenAllNodes(tree);
    return {
      totalFiles: allNodes.filter((n) => n.type === "file").length,
      totalFolders: allNodes.filter((n) => n.type === "folder").length,
      totalSize: allNodes
        .filter((n) => n.type === "file")
        .reduce((sum, f) => sum + (f.size || 0), 0),
    };
  }, [tree]);

  const folderList = useMemo(() => {
    const all = flattenAllNodes(tree);
    return all
      .filter((n) => n.type === "folder")
      .map((n) => ({
        id: n.id,
        name: n.name,
        path: n.path || n.name,
      }));
  }, [tree]);

  return { stats, folderList };
};
