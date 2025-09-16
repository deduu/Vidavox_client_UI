// src/pages/DashboardPage.jsx
import React, { useContext, useMemo, useEffect, useState, useRef } from "react";
import { AuthContext } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import CreditsDashboard from "../components/CreditsDashboard";
import FolderTree from "../components/FolderTree";
import FileUpload from "../components/FileUpload";
import SidebarLayout from "../components/SidebarLayout";
import { flattenAllNodes } from "../utils/tree";
import {
  fetchFolderTree,
  createFolder,
  deleteFolder,
  deleteFile,
} from "../services/api";
import {
  Folder,
  Plus,
  Trash2,
  FilePlus,
  BarChart3,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";

export default function DashboardPage() {
  const { user, logout } = useContext(AuthContext);
  const [lastClickedIndex, setLastClickedIndex] = useState(null);
  const [tree, setTree] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [notification, setNotification] = useState({
    type: "",
    message: "",
    visible: false,
  });
  const navigate = useNavigate();

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

  const containerRef = useRef(null);

  useEffect(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      console.log("=== DASHBOARD PAGE CONTAINER ===");
      console.log("Bounding box:", rect);
      console.log(
        "Computed styles:",
        window.getComputedStyle(containerRef.current)
      );
    }
  }, []);
  // Enhanced notification system
  const showNotification = (type, message) => {
    setNotification({ type, message, visible: true });
    setTimeout(
      () => setNotification((prev) => ({ ...prev, visible: false })),
      4000
    );
  };

  const loadTree = async () => {
    try {
      const data = await fetchFolderTree();
      setTree(data);
    } catch (err) {
      console.error("Failed to load folder tree", err);
      showNotification(
        "error",
        "Failed to load your files. Please refresh the page."
      );
    }
  };

  useEffect(() => {
    loadTree();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const handleCreate = async () => {
    const name = prompt("Enter folder name:");
    if (!name?.trim()) return;

    setIsCreating(true);
    try {
      await createFolder(name.trim(), selectedItems[0]?.id);
      setSelectedItems([]);
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

  const handleDelete = async () => {
    if (selectedItems.length === 0) return;
    if (
      !window.confirm(
        `Delete ${selectedItems.length} item(s)? This action cannot be undone.`
      )
    )
      return;

    setIsDeleting(true);
    try {
      for (const item of selectedItems) {
        if (item.type === "folder") {
          await deleteFolder(item.id);
        } else {
          await deleteFile(item.id);
        }
      }
      setSelectedItems([]);
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

  const getSelectionSummary = () => {
    const folders = selectedItems.filter(
      (item) => item.type === "folder"
    ).length;
    const files = selectedItems.filter((item) => item.type === "file").length;

    if (folders && files)
      return `${folders} folder${folders > 1 ? "s" : ""}, ${files} file${
        files > 1 ? "s" : ""
      }`;
    if (folders) return `${folders} folder${folders > 1 ? "s" : ""}`;
    if (files) return `${files} file${files > 1 ? "s" : ""}`;
    return "";
  };

  const selectedFolderId =
    selectedItems.length === 1 && selectedItems[0].type === "folder"
      ? selectedItems[0].id
      : null;

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

  const formatBytes = (bytes) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  return (
    <SidebarLayout fit>
      <div className="flex flex-col flex-1 h-full bg-dark">
        {/* Enhanced Notification System */}
        <div
          className={`fixed top-4 right-4 z-50 transform transition-all duration-300 ${
            notification.visible
              ? "translate-x-0 opacity-100"
              : "translate-x-full opacity-0"
          }`}
        >
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg backdrop-blur-sm border ${
              notification.type === "success"
                ? "bg-green-50/90 border-green-200 text-green-800"
                : "bg-red-50/90 border-red-200 text-red-800"
            }`}
          >
            {notification.type === "success" ? (
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            )}
            <span className="text-sm font-medium">{notification.message}</span>
          </div>
        </div>

        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6 space-y-6">
          <div className="flex items-center justify-between">
            {/* Quick Stats Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-white/40">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Total Files
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats.totalFiles}
                    </p>
                  </div>
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <FilePlus className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </div>
              <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-white/40">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Folders</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats.totalFolders}
                    </p>
                  </div>
                  <div className="p-2 bg-emerald-100 rounded-lg">
                    <Folder className="w-6 h-6 text-emerald-600" />
                  </div>
                </div>
              </div>
              <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-white/40">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Storage Used
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatBytes(stats.totalSize)}
                    </p>
                  </div>
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <BarChart3 className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Credits Section - More Compact */}
          <div className="bg-white/60 backdrop-blur-sm rounded-xl shadow-sm border border-white/40 overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-gray-100/60">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                Account Overview
              </h2>
            </div>
            <div className="p-6">
              <CreditsDashboard />
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
            {/* Enhanced File Explorer */}
            <div className="xl:col-span-3 flex flex-col min-h-[32rem] bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl border border-white/30 overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-slate-50 to-gray-50 px-6 py-4 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-800 flex items-center">
                    <svg
                      className="w-5 h-5 text-blue-600 mr-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z"
                      />
                    </svg>
                    File Explorer
                  </h2>
                  {selectedItems.length > 0 && (
                    <div className="flex items-center space-x-2">
                      <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                        {selectedItems.length} selected
                      </div>
                    </div>
                  )}
                </div>
                {selectedItems.length > 0 && (
                  <p className="text-sm text-gray-600 mt-1">
                    {getSelectionSummary()}
                  </p>
                )}
              </div>

              {/* Action Bar */}
              <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100">
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={handleCreate}
                    disabled={isCreating}
                    className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-300 disabled:to-gray-400 text-white text-sm font-medium rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl disabled:shadow-none transform hover:scale-105 disabled:scale-100"
                  >
                    <svg
                      className="w-4 h-4 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                    {isCreating ? "Creating..." : "New Folder"}
                  </button>

                  <button
                    onClick={handleDelete}
                    disabled={selectedItems.length === 0 || isDeleting}
                    className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:from-gray-300 disabled:to-gray-400 text-white text-sm font-medium rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl disabled:shadow-none transform hover:scale-105 disabled:scale-100"
                  >
                    <svg
                      className="w-4 h-4 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                    {isDeleting
                      ? "Deleting..."
                      : `Delete (${selectedItems.length})`}
                  </button>
                </div>
              </div>

              {/* Tree View */}
              <div className="p-6 flex-1 overflow-y-auto bg-white/50">
                {tree.length > 0 ? (
                  <FolderTree
                    nodes={tree}
                    selectedItems={selectedItems}
                    onToggle={toggleSelect}
                    expandedFolders={expandedFolders}
                    setExpandedFolders={setExpandedFolders}
                  />
                ) : (
                  <div className="text-center py-8">
                    <svg
                      className="mx-auto w-12 h-12 text-gray-300 mb-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 4V2a1 1 0 011-1h4a1 1 0 011 1v2h4a1 1 0 011 1v14a2 2 0 01-2 2H6a2 2 0 01-2-2V5a1 1 0 011-1h1z"
                      />
                    </svg>
                    <p className="text-gray-500 text-sm">
                      No files or folders yet
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Enhanced Upload Panel */}
            <div className="xl:col-span-2">
              <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl border border-white/30 overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-emerald-50 to-green-50 px-6 py-4 border-b border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-800 flex items-center">
                    <div className="w-3 h-3 bg-green-500 rounded-full mr-3 animate-pulse"></div>
                    File Upload Center
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Drag and drop files or click to browse
                  </p>
                </div>

                {/* Upload Area */}
                <div className="p-8 min-h-[32rem] flex flex-col">
                  {selectedItems.length === 1 &&
                  selectedItems[0].type === "folder" ? (
                    <div className="flex-1">
                      <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center">
                          <svg
                            className="w-5 h-5 text-green-600 mr-2"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          <span className="text-green-800 font-medium">
                            Ready to upload
                          </span>
                        </div>
                        <p className="text-green-700 text-sm mt-1">
                          Files will be uploaded to the selected folder
                        </p>
                      </div>
                      <FileUpload
                        folderId={selectedItems[0].id}
                        onUpload={loadTree}
                      />
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center">
                      <div className="text-center max-w-md">
                        <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                          <svg
                            className="w-10 h-10 text-blue-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.5}
                              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                            />
                          </svg>
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-3">
                          Select a Destination
                        </h3>
                        <p className="text-gray-600 leading-relaxed mb-6">
                          {selectedItems.length === 0
                            ? "Choose a folder from the file explorer to start uploading your files securely."
                            : selectedItems.length > 1
                            ? "Please select exactly one folder to enable file uploads."
                            : "The selected item is not a folder. Please select a folder to upload files."}
                        </p>
                        {selectedItems.length === 0 && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div className="flex items-start">
                              <svg
                                className="w-5 h-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                              </svg>
                              <div className="text-left">
                                <p className="text-blue-800 font-medium text-sm">
                                  Quick tip
                                </p>
                                <p className="text-blue-700 text-sm mt-1">
                                  Create a new folder first, then select it to
                                  organize your uploads
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}
