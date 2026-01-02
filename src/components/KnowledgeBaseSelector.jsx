// components/KnowledgeBaseSelector.jsx
import React, { useState, useRef, useEffect } from "react";
import {
  Search,
  ChevronDown,
  X,
  Database,
  FileText,
  Check,
} from "lucide-react";

export default function KnowledgeBaseSelector({
  kbs = [],
  selectedKbs = [],
  onSelectionChange,
  disabled = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  const filteredKbs = kbs.filter(
    (kb) =>
      kb.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      kb.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const handleKbToggle = (kb) => {
    const isSelected = selectedKbs.some((selected) => selected.id === kb.id);
    const newSelection = isSelected
      ? selectedKbs.filter((selected) => selected.id !== kb.id)
      : [...selectedKbs, kb];
    console.log(
      "🔄 New KB selection:",
      newSelection.map((k) => k.id)
    );
    onSelectionChange(newSelection);
  };

  const handleRemoveKb = (kbToRemove) => {
    const newSelection = selectedKbs.filter((kb) => kb.id !== kbToRemove.id);
    console.log("❌ Removed KB:", kbToRemove.id);
    console.log(
      "🔄 After removal:",
      newSelection.map((k) => k.id)
    );
    onSelectionChange(newSelection);
  };

  const handleClearAll = () => {
    onSelectionChange([]);
  };

  const getDisplayText = () => {
    if (selectedKbs.length === 0) return "Select Knowledge Bases";
    if (selectedKbs.length === 1) return selectedKbs[0].name;
    return `${selectedKbs.length} Knowledge Bases Selected`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Main Selector Button */}
      <button
        type="button"
        className={`
          relative w-full min-w-[16rem] px-4 py-2.5 text-left bg-white border border-gray-300 rounded-lg shadow-sm
          hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          transition-colors duration-200
          ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
        `}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Database className="w-4 h-4 text-gray-500 flex-shrink-0" />
            <span className="text-sm font-medium text-gray-700 truncate">
              {getDisplayText()}
            </span>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-gray-500 transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </div>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-80 overflow-hidden">
          {/* Search */}
          <div className="p-3 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search knowledge bases..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* KB List */}
          <div className="max-h-64 overflow-y-auto">
            {filteredKbs.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                {searchTerm
                  ? "No knowledge bases found"
                  : "No knowledge bases available"}
              </div>
            ) : (
              filteredKbs.map((kb) => {
                const isSelected = selectedKbs.some(
                  (selected) => selected.id === kb.id
                );
                return (
                  <div
                    key={kb.id}
                    className={`px-4 py-3 cursor-pointer transition-colors duration-150
                      hover:bg-gray-50 border-b border-gray-100 last:border-b-0
                      ${isSelected ? "bg-blue-50 border-blue-100" : ""}
                    `}
                    onClick={() => handleKbToggle(kb)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div
                          className={`w-4 h-4 border-2 rounded flex items-center justify-center ${
                            isSelected
                              ? "bg-blue-500 border-blue-500"
                              : "border-gray-300"
                          }`}
                        >
                          {isSelected && (
                            <Check className="w-3 h-3 text-white" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900 truncate">
                              {kb.name}
                            </span>
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <FileText className="w-3 h-3" />
                              {kb.file_count || 0}
                            </span>
                          </div>
                          {kb.description && (
                            <p className="text-xs text-gray-500 mt-1 truncate">
                              {kb.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {filteredKbs.length > 0 && (
            <div className="p-3 bg-gray-50 border-t border-gray-200">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>
                  {selectedKbs.length} of {kbs.length} selected
                </span>
                <button
                  type="button"
                  className="text-blue-600 hover:text-blue-800 font-medium"
                  onClick={() => setIsOpen(false)}
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Selected KB Chips */}
      {/* {selectedKbs.length > 0 && (
        <div className="absolute top-full right-0 mt-2 z-10">
          <div className="flex flex-wrap gap-1 justify-end">
            {selectedKbs.map((kb) => (
              <div
                key={kb.id}
                className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full"
              >
                <span className="truncate max-w-[8rem]">{kb.name}</span>
                <button
                  type="button"
                  className="hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                  onClick={() => handleRemoveKb(kb)}
                >
                  <span className="sr-only">Remove</span>×
                </button>
              </div>
            ))}
            {selectedKbs.length > 1 && (
              <button
                type="button"
                className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700 underline"
                onClick={handleClearAll}
              >
                Clear all
              </button>
            )}
          </div>
        </div>
      )} */}
    </div>
  );
}
