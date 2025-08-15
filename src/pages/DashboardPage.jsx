// src/pages/DashboardPage.jsx
import React, { useContext, useMemo, useEffect, useState } from "react";
import { AuthContext } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import CreditsDashboard from "../components/CreditsDashboard";
import FolderTree from "../components/FolderTree";
import FileUpload from "../components/FileUpload";
import SidebarLayout from "../components/SidebarLayout";
import IngestPanel from "../components/IngestPanel";
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
    <SidebarLayout>
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

      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50">
        <div className="max-w-7xl mx-auto p-6">
          {/* Enhanced Header with Stats */}
          <div className="mb-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
              <div className="space-y-2">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  Knowledge Hub
                </h1>
                <p className="text-lg text-gray-600 font-light">
                  Organize, process, and explore your documents with AI
                </p>
              </div>
              <div className="flex items-center space-x-6 mt-4 lg:mt-0">
                <div className="hidden sm:flex items-center space-x-2 text-sm text-gray-500">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span>System Online</span>
                </div>
                <button
                  onClick={() => loadTree()}
                  className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-white/60 rounded-lg transition-colors"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </button>
              </div>
            </div>

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

          {/* Main Content Grid - Improved Layout */}
          <div className="space-y-6">
            {/* File Explorer - More Space */}

            <div className="bg-white/60 backdrop-blur-sm rounded-xl shadow-sm border border-white/40 overflow-hidden h-full flex flex-col">
              {/* Enhanced Header */}
              <div className="px-6 py-4 border-b border-gray-100/60 bg-gradient-to-r from-slate-50/80 to-gray-50/80">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-800 flex items-center">
                    <Folder className="w-5 h-5 text-blue-600 mr-3" />
                    File Explorer
                  </h2>
                  <div className="flex items-center gap-3">
                    {selectedItems.length > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                          {selectedItems.length} selected
                        </span>
                        <span className="text-sm text-gray-600">
                          {getSelectionSummary()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Enhanced Action Bar */}
              <div className="px-6 py-4 bg-gray-50/40 border-b border-gray-100/60">
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={handleCreate}
                    disabled={isCreating}
                    className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-300 disabled:to-gray-400 text-white text-sm font-medium rounded-lg transition-all duration-200 shadow-sm hover:shadow-md disabled:shadow-none transform hover:scale-[1.02] disabled:scale-100"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {isCreating ? "Creating..." : "New Folder"}
                  </button>

                  <button
                    onClick={handleDelete}
                    disabled={selectedItems.length === 0 || isDeleting}
                    className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:from-gray-300 disabled:to-gray-400 text-white text-sm font-medium rounded-lg transition-all duration-200 shadow-sm hover:shadow-md disabled:shadow-none transform hover:scale-[1.02] disabled:scale-100"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    {isDeleting
                      ? "Deleting..."
                      : selectedItems.length > 0
                      ? `Delete (${selectedItems.length})`
                      : "Delete"}
                  </button>

                  {selectedItems.length > 0 && (
                    <button
                      onClick={() => setSelectedItems([])}
                      className="inline-flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors"
                    >
                      Clear Selection
                    </button>
                  )}
                </div>
              </div>

              {/* Tree View - Improved Scrolling */}
              <div className="flex-1 overflow-hidden">
                <div className="h-full overflow-y-auto p-6 bg-white/30">
                  {tree.length > 0 ? (
                    <FolderTree
                      nodes={tree}
                      selectedItems={selectedItems}
                      onToggle={toggleSelect}
                      expandedFolders={expandedFolders}
                      setExpandedFolders={setExpandedFolders}
                    />
                  ) : (
                    <div className="text-center py-12">
                      <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <Folder className="w-8 h-8 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        No files yet
                      </h3>
                      <p className="text-gray-500 text-sm mb-4">
                        Start by uploading some documents or creating folders
                      </p>
                      <button
                        onClick={handleCreate}
                        className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Create First Folder
                      </button>
                      {/* ✅ FIXED: Malformed closing </p> tag removed from here */}
                      <button
                        onClick={handleCreate}
                        className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        {/* ✅ FIXED: Changed PlusIcon to the imported Plus component */}
                        <Plus className="w-4 h-4 mr-2" />
                        Create First Folder
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Document Upload - Better Proportions */}

            <div className="bg-white/60 backdrop-blur-sm rounded-xl shadow-sm border border-white/40 overflow-hidden h-fit">
              <div className="px-6 py-4 border-b border-gray-100/60 bg-gradient-to-r from-emerald-50/80 to-green-50/80">
                <h2 className="text-lg font-semibold text-gray-800 flex items-center">
                  <div className="w-3 h-3 bg-emerald-500 rounded-full mr-3 animate-pulse"></div>
                  Add Documents
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Upload files and configure processing options
                </p>
              </div>

              <div className="p-6">
                <IngestPanel
                  defaultFolderId={selectedFolderId}
                  folderList={folderList}
                  maxFiles={5}
                  onTreeRefresh={() => {
                    loadTree();
                    showNotification("success", "Files uploaded successfully!");
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}
