// src/components/KnowledgeBaseEditor.jsx
import { useEffect, useRef, useState } from "react";

export default function KnowledgeBaseEditor({
  onSave,
  onCancel,
  existingName = "",
  existingFileIds = [],
  allFiles = [],
}) {
  const [name, setName] = useState(existingName);
  const [selected, setSelected] = useState(new Set(existingFileIds));
  const [searchTerm, setSearchTerm] = useState("");

  const modalRef = useRef(null);

  // Optional: close modal if user clicks outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        onCancel();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onCancel]);

  const toggleFile = (id) => {
    const copy = new Set(selected);
    copy.has(id) ? copy.delete(id) : copy.add(id);
    setSelected(copy);
  };

  const selectAll = () => {
    setSelected(new Set(filteredFiles.map((f) => f.id)));
  };

  const deselectAll = () => {
    setSelected(new Set());
  };

  const filteredFiles = allFiles.filter((file) =>
    (file.fullPath || file.name)
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        ref={modalRef}
        className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-gray-200 overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  Knowledge Base Editor
                </h2>
                <p className="text-blue-100 text-sm">
                  Create and configure your knowledge base
                </p>
              </div>
            </div>

            <button
              className="text-white/80 hover:text-white hover:bg-white/10 p-2 rounded-lg transition-colors"
              onClick={onCancel}
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Name input */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Knowledge Base Name
            </label>
            <input
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              placeholder="Enter a descriptive name..."
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Search and selection controls */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">
                Select Files ({selected.size} selected)
              </label>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  Select All
                </button>
                <span className="text-gray-300">|</span>
                <button
                  type="button"
                  onClick={deselectAll}
                  className="text-sm text-gray-600 hover:text-gray-800 font-medium"
                >
                  Clear All
                </button>
              </div>
            </div>

            {/* Search bar */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg
                  className="w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search files..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          {/* File list */}
          <div className="space-y-2">
            <div className="max-h-80 overflow-y-auto border border-gray-200 rounded-lg bg-gray-50">
              {filteredFiles.length === 0 ? (
                <div className="text-center py-12">
                  <div className="mx-auto w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mb-3">
                    <svg
                      className="w-6 h-6 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                  <p className="text-gray-500 font-medium">
                    No matching files found
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    Try adjusting your search terms
                  </p>
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {filteredFiles.map((file) => (
                    <label
                      key={file.id}
                      className="flex items-center p-3 hover:bg-blue-50 rounded-lg cursor-pointer group transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selected.has(file.id)}
                        onChange={() => toggleFile(file.id)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                      />
                      <div className="ml-3 flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <div className="w-6 h-6 bg-blue-100 rounded flex items-center justify-center flex-shrink-0">
                            <svg
                              className="w-3 h-3 text-blue-600"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                              />
                            </svg>
                          </div>
                          <span className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-700 transition-colors">
                            {file.fullPath || file.name}
                          </span>
                        </div>
                      </div>
                      <div className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            selected.has(file.id)
                              ? "bg-blue-500"
                              : "bg-gray-300"
                          }`}
                        ></div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              className="px-6 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 font-medium rounded-lg transition-colors duration-200"
              onClick={onCancel}
            >
              Cancel
            </button>
            <button
              className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium rounded-lg shadow-sm transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              onClick={() => onSave(name, Array.from(selected))}
              disabled={!name.trim() || selected.size === 0}
            >
              <div className="flex items-center space-x-2">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span>Create Knowledge Base</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
