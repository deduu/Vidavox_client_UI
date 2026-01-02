// src/hooks/useDashboardActions.js
import { useState } from "react";
import { createFolder, deleteFolder, deleteFile } from "../services/api";

export const useDashboardActions = (
  showNotification,
  clearSelection,
  loadTree
) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async (selectedItems) => {
    const name = prompt("Enter folder name:");
    if (!name?.trim()) return;

    setIsCreating(true);
    try {
      await createFolder(name.trim(), selectedItems[0]?.id);
      clearSelection();
      await loadTree();
      showNotification(
        "success",
        `Folder "${name.trim()}" created successfully`
      );
    } catch (error) {
      console.error("Failed to create folder:", error);
      showNotification("error", "Failed to create folder. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (selectedItems) => {
    if (selectedItems.length === 0) return;

    const confirmMessage = `Delete ${selectedItems.length} item(s)? This action cannot be undone.`;
    if (!window.confirm(confirmMessage)) return;

    setIsDeleting(true);
    try {
      for (const item of selectedItems) {
        if (item.type === "folder") {
          await deleteFolder(item.id);
        } else {
          await deleteFile(item.id);
        }
      }
      clearSelection();
      await loadTree();
      showNotification(
        "success",
        `${selectedItems.length} item(s) deleted successfully`
      );
    } catch (error) {
      console.error("Failed to delete items:", error);
      showNotification("error", "Failed to delete items. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRefresh = () => {
    loadTree();
    showNotification("success", "Files refreshed successfully");
  };

  return {
    isDeleting,
    isCreating,
    handleCreate,
    handleDelete,
    handleRefresh,
  };
};
