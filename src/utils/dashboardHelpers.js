// src/utils/dashboardHelpers.js
export const formatBytes = (bytes) => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
};

export const getSelectionSummary = (selectedItems) => {
  const folders = selectedItems.filter((item) => item.type === "folder").length;
  const files = selectedItems.filter((item) => item.type === "file").length;

  if (folders && files)
    return `${folders} folder${folders > 1 ? "s" : ""}, ${files} file${
      files > 1 ? "s" : ""
    }`;
  if (folders) return `${folders} folder${folders > 1 ? "s" : ""}`;
  if (files) return `${files} file${files > 1 ? "s" : ""}`;
  return "";
};

export const getSelectedFolderId = (selectedItems) => {
  return selectedItems.length === 1 && selectedItems[0].type === "folder"
    ? selectedItems[0].id
    : null;
};
