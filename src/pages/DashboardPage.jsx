// src/pages/DashboardPage.jsx
import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import CreditsDashboard from '../components/CreditsDashboard';
import FolderTree from '../components/FolderTree';
import FileUpload from '../components/FileUpload';
import {
  fetchFolderTree,
  createFolder,
  deleteFolder,
  deleteFile,
} from '../services/api';

export default function DashboardPage() {
  const { user, logout } = useContext(AuthContext);

  const [tree, setTree] = useState([]);
  // array of { id, type }
  const [selectedItems, setSelectedItems] = useState([]);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadTree = () => fetchFolderTree().then(setTree);
  useEffect(()=> { loadTree(); }, []);

  const toggleSelect = node => {
    setSelectedItems(prev => {
      if (prev.find(i => i.id === node.id)) {
        return prev.filter(i => i.id !== node.id);
      }
      return [...prev, { id: node.id, type: node.type }];
    });
  };

  const handleCreate = async () => {
    const name = prompt('New folder name');
    if (!name) return;
    await createFolder(name, selectedItems[0]?.id);
    loadTree();
  };

  const handleDelete = async () => {
    if (selectedItems.length === 0) return;
    if (!window.confirm(`Delete ${selectedItems.length} item(s)?`)) return;

    setIsDeleting(true);
    for (const item of selectedItems) {
      if (item.type === 'folder') {
        await deleteFolder(item.id);
      } else {
        await deleteFile(item.id);
      }
    }
    setSelectedItems([]);
    await loadTree();
    setIsDeleting(false);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between">
          <h1 className="text-2xl font-bold">Hi, {user.username}</h1>
          <button onClick={logout} className="text-red-600 hover:text-red-800">
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <CreditsDashboard />
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* folder/file tree panel */}
          <div className="lg:w-1/3 bg-white p-6 rounded-lg shadow">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Folders & Files</h2>
              <div className="space-x-2">
                <button
                  onClick={handleCreate}
                  className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                  disabled={isDeleting}
                >
                  + New
                </button>
                <button
                  onClick={handleDelete}
                  disabled={selectedItems.length === 0 || isDeleting}
                  className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
                >
                  {isDeleting
                    ? 'Deleting…'
                    : `Delete (${selectedItems.length})`}
                </button>
              </div>
            </div>

            <FolderTree
              nodes={tree}
              selectedIds={selectedItems.map(i => i.id)}
              onToggle={toggleSelect}
            />
          </div>

          {/* upload panel */}
          <div className="lg:w-2/3 bg-white p-6 rounded-lg shadow">
            {selectedItems.length === 1 && selectedItems[0].type === 'folder' ? (
              <FileUpload
                folderId={selectedItems[0].id}
                onUpload={loadTree}
              />
            ) : (
              <p className="text-gray-500">
                {selectedItems.length === 0
                  ? 'Select a single folder to upload files.'
                  : 'Please select exactly one folder to upload.'}
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
