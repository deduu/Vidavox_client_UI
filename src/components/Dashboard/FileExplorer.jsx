// src/components/dashboard/FileExplorer.jsx
import React from "react";
import { FolderTree, Plus, Trash2, RefreshCw, Search } from "lucide-react";

export const FileExplorerHeader = ({ selectedItems, getSelectionSummary }) => (
  <div className="bg-gradient-to-r from-slate-50 via-white to-slate-50 px-8 py-6 border-b border-gray-200/60">
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-4">
        <div className="p-2 bg-blue-100 rounded-xl">
          <FolderTree className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">File Explorer</h2>
          <p className="text-sm text-gray-500 mt-1">
            Manage your files and folders
          </p>
        </div>
      </div>

      {selectedItems.length > 0 && (
        <div className="flex items-center space-x-3">
          <div className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl shadow-lg">
            <span className="text-sm font-semibold">
              {selectedItems.length} selected
            </span>
          </div>
        </div>
      )}
    </div>

    {selectedItems.length > 0 && (
      <div className="mt-3 text-sm text-gray-600 bg-blue-50 px-4 py-2 rounded-lg border border-blue-200">
        Selected: {getSelectionSummary()}
      </div>
    )}
  </div>
);

export const ActionBar = ({
  handleCreate,
  handleDelete,
  selectedItems,
  isCreating,
  isDeleting,
  onRefresh,
}) => (
  <div className="px-8 py-5 bg-gray-50/80 border-b border-gray-200/60">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex flex-wrap gap-3">
        <ActionButton
          onClick={handleCreate}
          disabled={isCreating}
          loading={isCreating}
          loadingText="Creating..."
          className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
          icon={<Plus className="w-4 h-4" />}
        >
          New Folder
        </ActionButton>

        <ActionButton
          onClick={handleDelete}
          disabled={selectedItems.length === 0 || isDeleting}
          loading={isDeleting}
          loadingText="Deleting..."
          className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800"
          icon={<Trash2 className="w-4 h-4" />}
        >
          Delete ({selectedItems.length})
        </ActionButton>
      </div>

      <ActionButton
        onClick={onRefresh}
        className="bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800"
        icon={<RefreshCw className="w-4 h-4" />}
      >
        Refresh
      </ActionButton>
    </div>
  </div>
);

const ActionButton = ({
  onClick,
  disabled,
  loading,
  loadingText,
  className,
  icon,
  children,
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`inline-flex items-center px-6 py-3 text-white text-sm font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none transform hover:scale-105 ${className}`}
  >
    {loading ? (
      <>
        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
        {loadingText}
      </>
    ) : (
      <>
        {icon && <span className="mr-2">{icon}</span>}
        {children}
      </>
    )}
  </button>
);

export const EmptyState = () => (
  <div className="text-center py-16">
    <div className="mx-auto w-24 h-24 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-3xl flex items-center justify-center mb-6 shadow-lg">
      <FolderTree className="w-12 h-12 text-blue-500" />
    </div>
    <h3 className="text-xl font-semibold text-gray-900 mb-2">No files yet</h3>
    <p className="text-gray-500 max-w-md mx-auto leading-relaxed">
      Get started by creating your first folder or uploading some files to
      organize your content.
    </p>
    <div className="mt-6 text-sm text-gray-400">
      💡 Tip: Create folders to keep your files organized
    </div>
  </div>
);
