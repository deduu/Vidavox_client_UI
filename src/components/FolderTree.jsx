import React from 'react';

export default function FolderTree({ nodes, selectedIds, onToggle }) {
  return (
    <ul className="pl-4">
      {nodes.map(node => {
        const isSelected = selectedIds.includes(node.id);
        return (
          <li key={node.id}>
            <div
              className={
                `flex items-center cursor-pointer p-1 rounded 
                 ${isSelected ? 'bg-blue-100 font-semibold' : 'hover:bg-gray-100'}`
              }
              onClick={() => onToggle(node)}
            >
              <span className="mr-2">{node.type === 'folder' ? '📁' : '📄'}</span>
              <span>{node.name}</span>
            </div>

            {node.children?.length > 0 && (
              <FolderTree
                nodes={node.children}
                selectedIds={selectedIds}
                onToggle={onToggle}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}
