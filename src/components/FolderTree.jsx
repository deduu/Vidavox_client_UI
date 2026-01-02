// src/components/FolderTree.jsx
import React from "react";
import PropTypes from "prop-types";
export default function FolderTree({
  nodes,
  selectedItems,
  onToggle,
  expandedFolders,
  setExpandedFolders,
}) {
  const toggleExpand = (id) => {
    setExpandedFolders((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  };

  return (
    <ul className="pl-4">
      {nodes.map((node) => {
        const isSelected = selectedItems.some(
          (sel) => sel.id === node.id && sel.type === node.type
        );
        const isExpanded = expandedFolders.includes(node.id);

        const handleClick = (e) => {
          e.stopPropagation();
          onToggle(node, e);
        };

        return (
          <li key={node.id}>
            <div
              onClick={handleClick}
              className={`flex items-center cursor-pointer p-1 rounded ${
                isSelected ? "bg-blue-50" : "hover:bg-gray-100"
              }`}
            >
              {node.type === "folder" && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleExpand(node.id);
                  }}
                  className="mr-2 text-sm"
                >
                  {isExpanded ? "▾" : "▸"}
                </button>
              )}
              <input
                type="checkbox"
                checked={isSelected}
                onChange={handleClick}
                onClick={(e) => e.stopPropagation()}
                className="mr-2 accent-blue-500"
              />
              <span className="mr-2">
                {node.type === "folder" ? "📁" : "📄"}
              </span>
              <span>{node.name}</span>
            </div>

            {isExpanded && node.children?.length > 0 && (
              <ul className="pl-4">
                <FolderTree
                  nodes={node.children}
                  selectedItems={selectedItems}
                  onToggle={onToggle}
                  expandedFolders={expandedFolders}
                  setExpandedFolders={setExpandedFolders}
                />
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}

FolderTree.propTypes = {
  nodes: PropTypes.array.isRequired,
  selectedItems: PropTypes.array.isRequired,
  onToggle: PropTypes.func.isRequired,
};
