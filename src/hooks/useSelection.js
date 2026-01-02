// src/hooks/useSelection.js
import { useState } from "react";
import { flattenAllNodes } from "../utils/tree";

export const useSelection = (tree) => {
  const [selectedItems, setSelectedItems] = useState([]);
  const [lastClickedIndex, setLastClickedIndex] = useState(null);

  const toggleSelect = (node, event) => {
    const flatList = flattenAllNodes(tree);

    setSelectedItems((prev) => {
      const index = flatList.findIndex(
        (n) => n.id === node.id && n.type === node.type
      );

      if (event.shiftKey && lastClickedIndex !== null) {
        const start = Math.min(lastClickedIndex, index);
        const end = Math.max(lastClickedIndex, index);
        const rangeItems = flatList
          .slice(start, end + 1)
          .map((n) => ({ id: n.id, type: n.type }));
        return Array.from(
          new Map(
            [...prev, ...rangeItems].map((i) => [i.id + i.type, i])
          ).values()
        );
      }

      const exists = prev.some((i) => i.id === node.id && i.type === node.type);
      return exists
        ? prev.filter((i) => !(i.id === node.id && i.type === node.type))
        : [...prev, { id: node.id, type: node.type }];
    });

    const newIdx = flatList.findIndex(
      (n) => n.id === node.id && n.type === node.type
    );
    setLastClickedIndex(newIdx);
  };

  const clearSelection = () => {
    setSelectedItems([]);
    setLastClickedIndex(null);
  };

  return { selectedItems, toggleSelect, clearSelection };
};
