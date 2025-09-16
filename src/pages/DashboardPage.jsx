// src/pages/DashboardPage.jsx - Final Optimized Version
import React, { useContext } from "react";
import { AuthContext } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import CreditsDashboard from "../components/CreditsDashboard";
import FolderTree from "../components/FolderTree";
import FileUpload from "../components/FileUpload";
import SidebarLayout from "../components/SidebarLayout";

// Import custom hooks
import { useNotifications } from "../hooks/useNotifications";
import { useTreeData } from "../hooks/useTreeData";
import { useSelection } from "../hooks/useSelection";
import { useExpandedFolders } from "../hooks/useExpandedFolders";
import { useDashboardActions } from "../hooks/useDashboardActions";
import { useDashboardData } from "../hooks/useDashboardData";

// Import utility functions
import {
  formatBytes,
  getSelectionSummary,
  getSelectedFolderId,
} from "../utils/dashboardHelpers";

// Import modular components
import { NotificationSystem } from "../components/Dashboard/NotificationSystem";
import { StatsCards } from "../components/Dashboard/StatsCards";
import {
  FileExplorerHeader,
  ActionBar,
  EmptyState,
} from "../components/Dashboard/FileExplorer";
import {
  UploadCenterHeader,
  UploadPrompt,
  UploadReadyState,
} from "../components/Dashboard/UploadCenter";
import { AccountOverview } from "../components/Dashboard/AccountOverview";
import { LoadingCard, ErrorState } from "../components/Dashboard/LoadingStates";

export default function DashboardPage() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  // Custom hooks for state management
  const { notification, showNotification, hideNotification } =
    useNotifications();
  const { tree, loadTree, isLoading, error } = useTreeData(showNotification);
  const { selectedItems, toggleSelect, clearSelection } = useSelection(tree);
  const { expandedFolders, setExpandedFolders } = useExpandedFolders();

  // Computed data
  const { stats, folderList } = useDashboardData(tree);
  const selectedFolderId = getSelectedFolderId(selectedItems);

  // Action handlers
  const { isDeleting, isCreating, handleCreate, handleDelete, handleRefresh } =
    useDashboardActions(showNotification, clearSelection, loadTree);

  // Enhanced error handling
  if (error) {
    return (
      <SidebarLayout fit>
        <div className="flex flex-col flex-1 h-full">
          <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-6 flex items-center justify-center">
            <ErrorState
              title="Failed to Load Dashboard"
              description="We couldn't load your files and folders. Please check your connection and try again."
              onRetry={loadTree}
            />
          </div>
        </div>
      </SidebarLayout>
    );
  }

  // Enhanced loading state
  if (isLoading) {
    return (
      <SidebarLayout fit>
        <div className="flex flex-col flex-1 h-full">
          <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <LoadingCard title="Loading files..." />
              <LoadingCard title="Loading folders..." />
              <LoadingCard title="Calculating storage..." />
            </div>
            <LoadingCard
              title="Setting up your dashboard..."
              description="This will just take a moment"
            />
          </div>
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout fit>
      <div className="flex flex-col flex-1 h-full">
        {/* Enhanced Notification System */}
        <NotificationSystem
          notification={notification}
          onClose={hideNotification}
        />

        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-6 space-y-8">
          {/* Welcome Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Welcome back, {user?.name || "User"}! 👋
            </h1>
            <p className="text-lg text-gray-600">
              Manage your files and monitor your account from your dashboard
            </p>
          </div>

          {/* Enhanced Stats Cards */}
          <StatsCards stats={stats} formatBytes={formatBytes} />

          {/* Account Overview Section */}
          <AccountOverview CreditsDashboard={CreditsDashboard} />

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            {/* Enhanced File Explorer - Takes 2/3 of the width */}
            <div className="xl:col-span-2 flex flex-col bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 overflow-hidden">
              <FileExplorerHeader
                selectedItems={selectedItems}
                getSelectionSummary={() => getSelectionSummary(selectedItems)}
              />

              <ActionBar
                handleCreate={() => handleCreate(selectedItems)}
                handleDelete={() => handleDelete(selectedItems)}
                selectedItems={selectedItems}
                isCreating={isCreating}
                isDeleting={isDeleting}
                onRefresh={handleRefresh}
              />

              {/* Tree View with Enhanced Styling */}
              <div className="p-8 flex-1 overflow-y-auto bg-gradient-to-b from-white/90 to-gray-50/90 min-h-[32rem]">
                {tree.length > 0 ? (
                  <div className="space-y-2">
                    <FolderTree
                      nodes={tree}
                      selectedItems={selectedItems}
                      onToggle={toggleSelect}
                      expandedFolders={expandedFolders}
                      setExpandedFolders={setExpandedFolders}
                    />
                  </div>
                ) : (
                  <EmptyState />
                )}
              </div>
            </div>

            {/* Enhanced Upload Center - Takes 1/3 of the width */}
            <div className="xl:col-span-1">
              <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 overflow-hidden flex flex-col">
                <UploadCenterHeader />

                <div className="flex-1 flex flex-col min-h-[32rem]">
                  {selectedFolderId ? (
                    <div className="p-8 flex-1">
                      <UploadReadyState
                        selectedFolderId={selectedFolderId}
                        onUpload={loadTree}
                        FileUpload={FileUpload}
                      />
                    </div>
                  ) : (
                    <UploadPrompt selectedItems={selectedItems} />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions Footer */}
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-white/40 shadow-lg">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Quick Actions
                </h3>
                <p className="text-sm text-gray-600">
                  Common tasks to help you manage your files efficiently
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <QuickActionButton
                  onClick={() => handleCreate([])}
                  disabled={isCreating}
                  icon="📁"
                  text="New Folder"
                />
                <QuickActionButton
                  onClick={handleRefresh}
                  icon="🔄"
                  text="Refresh"
                />
                <QuickActionButton
                  onClick={() => navigate("/settings")}
                  icon="⚙️"
                  text="Settings"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}

// Quick Action Button Component
const QuickActionButton = ({ onClick, disabled, icon, text }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className="inline-flex items-center px-4 py-2 bg-white/80 hover:bg-white border border-gray-200 hover:border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:text-gray-900 transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 disabled:transform-none"
  >
    <span className="mr-2 text-lg">{icon}</span>
    {text}
  </button>
);
