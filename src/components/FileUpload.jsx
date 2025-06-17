
// src/components/FileUpload.jsx
import React, { useState } from 'react';
import { uploadFiles } from '../services/api';

export default function FileUpload({ folderId, onUpload }) {
  const [files, setFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    if (files.length === 0) return;
    setIsUploading(true);
    await uploadFiles(files, folderId);
    setFiles([]);    // clear the selection
    await onUpload();
    setIsUploading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-2">
      <input
        type="file"
        multiple
        disabled={isUploading}
        onChange={e => setFiles(Array.from(e.target.files))}
        className="block"
      />
      <button
        type="submit"
        disabled={files.length === 0 || isUploading}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
      >
        {isUploading ? 'Uploading…' : `Upload ${files.length} File${files.length>1?'s':''}`}
      </button>
    </form>
  );
}