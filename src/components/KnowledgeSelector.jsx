// src/components/KnowledgeSelector.jsx
import React, { useState } from "react";
import FolderTree from "./FolderTree";

export default function KnowledgeSelector({ tree, onChange }) {
  const [selectedIds, setSelected] = useState([]);

  const toggle = (node) => {
    setSelected((prev) =>
      prev.includes(node.id)
        ? prev.filter((id) => id !== node.id)
        : [...prev, node.id]
    );
  };

  // notify parent
  React.useEffect(() => onChange(selectedIds), [selectedIds]);

  return (
    <div className="p-4 border-r">
      <h2 className="font-semibold mb-2">Select Knowledge</h2>
      <FolderTree nodes={tree} selectedIds={selectedIds} onToggle={toggle} />
    </div>
  );
}
