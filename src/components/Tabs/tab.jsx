import React, { useRef, useState, useEffect } from "react";
import { Folder, File, Upload, Plus, Search, MoreVertical, FolderOpen } from "lucide-react";
import { api } from "../../services/api";


function DocumentsTab() {
  const fileInputRef = useRef(null);
  const [selectedFolderId, setSelectedFolderId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState("");
  const [fileTree, setFileTree] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const [query, setQuery] = useState("");

  const loadTree = async () => {
    try {
      setLoading(true);
      const tree = await api.listTree();
      setFileTree(tree);
    } catch (err) {
      console.error("Failed to fetch folder tree", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTree();
  }, []);

  const handleUpload = async () => {
    const files = fileInputRef.current?.files;
    if (!files || files.length === 0) return;

    const formData = new FormData();
    for (let file of files) {
      formData.append("files", file);
    }

    setUploading(true);
    setUploadProgress(0);
    setUploadStatus("");

    try {
      await api.uploadToFolder(selectedFolderId, formData, (loaded, total, computable) => {
        if (computable) {
          const percent = Math.round((loaded / total) * 100);
          setUploadProgress(percent);
        }
      });
      setUploadStatus("Upload successful");
      await loadTree();
      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      setUploadStatus(`Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
      setTimeout(() => setUploadStatus(""), 5000);
    }
  };

  const toggleFolder = (folderId) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const renderFileTreeItem = (item, depth = 0) => {
    const isFolder = item.type === 'folder';
    const isExpanded = expandedFolders.has(item.id);
    const hasChildren = item.children && item.children.length > 0;

    return (
      <div key={item.id} className="w-100">
        <div
          className={`d-flex align-items-center py-2 px-3 rounded cursor-pointer position-relative ${
            selectedFolderId === item.id 
              ? 'bg-primary bg-opacity-10 border-start border-primary border-3' 
              : 'hover-bg-light'
          }`}
          style={{ 
            paddingLeft: `${depth * 20 + 12}px`,
            cursor: 'pointer',
            transition: 'background-color 0.2s'
          }}
          onClick={() => {
            if (isFolder) {
              toggleFolder(item.id);
              setSelectedFolderId(item.id);
            }
          }}
          onMouseEnter={(e) => {
            if (selectedFolderId !== item.id) {
              e.currentTarget.style.backgroundColor = '#f8f9fa';
            }
          }}
          onMouseLeave={(e) => {
            if (selectedFolderId !== item.id) {
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
        >
          <div className="d-flex align-items-center flex-grow-1" style={{ minWidth: 0 }}>
            {isFolder ? (
              <>
                {hasChildren && (
                  <button
                    className="btn btn-sm p-1 me-1 border-0"
                    style={{ 
                      width: '24px', 
                      height: '24px',
                      transition: 'transform 0.2s'
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFolder(item.id);
                    }}
                  >
                    <i 
                      className={`fas fa-chevron-right ${isExpanded ? 'rotate-90' : ''}`}
                      style={{ 
                        fontSize: '0.75rem',
                        transition: 'transform 0.2s',
                        transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)'
                      }}
                    ></i>
                  </button>
                )}
                {isExpanded ? (
                  <FolderOpen className="text-primary me-2" size={16} />
                ) : (
                  <Folder className="text-primary me-2" size={16} />
                )}
              </>
            ) : (
              <File className="text-secondary me-2" size={16} />
            )}
            <span className="small fw-medium text-dark text-truncate">
              {item.name}
            </span>
          </div>
          <button 
            className="btn btn-sm p-1 opacity-0 hover-opacity-100 border-0"
            style={{ transition: 'opacity 0.2s' }}
          >
            <MoreVertical size={12} className="text-muted" />
          </button>
        </div>
        
        {isFolder && isExpanded && hasChildren && (
          <div className="ms-2">
            {item.children.map(child => renderFileTreeItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const filteredTree = fileTree.filter(item =>
    item.name && item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-vh-100 bg-light p-4">
      <div className="container-fluid">
        {/* Header */}
        <div className="mb-4">
          <h1 className="display-6 fw-bold text-dark mb-2">Document Management</h1>
          <p className="text-muted">Organize, upload, and manage your documents efficiently</p>
        </div>

        <div className="row g-4">
          {/* File Explorer Sidebar */}
          <div className="col-lg-4">
            <div className="card shadow-sm border-0 h-100">
              {/* Sidebar Header */}
              <div className="card-header bg-gradient-primary-subtle border-bottom-0 py-3">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="fw-semibold mb-0 text-dark">
                    <i className="fas fa-folder-open text-primary me-2"></i>
                    Documents
                  </h5>
                  <button className="btn btn-outline-primary btn-sm rounded-pill">
                    <Plus size={16} className="me-1" />
                    New
                  </button>
                </div>
                
                {/* Search */}
                <div className="position-relative">
                  <Search className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" size={16} />
                  <input
                    type="text"
                    className="form-control form-control-sm ps-5 border-primary-subtle"
                    placeholder="Search files..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ borderRadius: '25px' }}
                  />
                </div>
              </div>

              {/* File Tree */}
              <div className="card-body p-2" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {loading ? (
                  <div className="d-flex align-items-center justify-content-center py-5">
                    <div className="spinner-border spinner-border-sm text-primary me-2" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                    <span className="small text-muted">Loading...</span>
                  </div>
                ) : filteredTree.length === 0 ? (
                  <div className="text-center py-5 text-muted">
                    <Folder size={48} className="text-black-50 mb-3" />
                    <p className="small mb-0">No documents found</p>
                  </div>
                ) : (
                  <div className="file-tree">
                    {filteredTree.map(item => renderFileTreeItem(item))}
                  </div>
                )}
              </div>

              {/* Upload Section */}
              <div className="card-footer bg-light border-top">
                <div className="d-grid gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    multiple
                    className="d-none"
                    onChange={() => {
                      const files = fileInputRef.current?.files;
                      if (files && files.length > 0) {
                        // Auto-trigger upload or show file selection
                      }
                    }}
                  />
                  
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="btn btn-outline-primary btn-sm d-flex align-items-center justify-content-center"
                    style={{ 
                      borderStyle: 'dashed',
                      borderWidth: '2px',
                      padding: '0.75rem'
                    }}
                  >
                    <Upload size={16} className="me-2" />
                    Choose Files
                  </button>

                  {fileInputRef.current?.files?.length > 0 && (
                    <button
                      onClick={handleUpload}
                      disabled={uploading}
                      className="btn btn-primary btn-sm d-flex align-items-center justify-content-center"
                    >
                      <Upload size={16} className="me-2" />
                      {uploading ? `Uploading... ${uploadProgress}%` : 'Upload Files'}
                    </button>
                  )}

                  {uploading && (
                    <div className="progress" style={{ height: '6px' }}>
                      <div
                        className="progress-bar progress-bar-striped progress-bar-animated"
                        role="progressbar"
                        style={{ width: `${uploadProgress}%` }}
                        aria-valuenow={uploadProgress}
                        aria-valuemin="0"
                        aria-valuemax="100"
                      ></div>
                    </div>
                  )}

                  {uploadStatus && (
                    <div className={`alert ${
                      uploadStatus.includes('successful') 
                        ? 'alert-success' 
                        : 'alert-danger'
                    } alert-sm py-2 mb-0`}>
                      <small>{uploadStatus}</small>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="col-lg-8">
            <div className="card shadow-sm border-0">
              <div className="card-header bg-white border-bottom py-4">
                <h4 className="fw-semibold text-dark mb-1">
                  <i className="fas fa-analytics text-primary me-2"></i>
                  Document Analysis
                </h4>
                <p className="text-muted small mb-0">Run cross-checks and analysis on your documents</p>
              </div>

              <div className="card-body p-4">
                <div className="row g-4">
                  {/* Query Input */}
                  <div className="col-12">
                    <label className="form-label fw-medium text-dark">
                      Cross-Check Query
                    </label>
                    <textarea
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      className="form-control border-primary-subtle"
                      rows={4}
                      placeholder="Describe what you want to cross-check in your documents. For example: 'Compare project timelines across all documents' or 'Find inconsistencies in financial data'..."
                      style={{ resize: 'none' }}
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="col-12">
                    <div className="d-flex flex-column flex-sm-row gap-3">
                      <button
                        type="button"
                        disabled={!query.trim()}
                        className="btn btn-primary flex-fill d-flex align-items-center justify-content-center py-3"
                      >
                        <i className="fas fa-play me-2"></i>
                        Run Analysis
                      </button>
                      
                      <button
                        type="button"
                        className="btn btn-outline-secondary px-4 py-3"
                      >
                        <i className="fas fa-bookmark me-2"></i>
                        Save Query
                      </button>
                    </div>
                  </div>

                  {/* Info Box */}
                  <div className="col-12">
                    <div className="alert alert-info border-0 bg-info bg-opacity-10">
                      <div className="d-flex">
                        <i className="fas fa-info-circle text-info me-3 mt-1 flex-shrink-0"></i>
                        <div>
                          <h6 className="alert-heading fw-semibold text-info mb-2">
                            Analysis Tips
                          </h6>
                          <p className="small text-info mb-0">
                            Be specific about what you want to analyze. You can compare data across documents, 
                            find inconsistencies, extract specific information, or validate compliance requirements.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .hover-bg-light:hover {
          background-color: #f8f9fa !important;
        }
        .hover-opacity-100:hover {
          opacity: 1 !important;
        }
        .bg-gradient-primary-subtle {
          background: linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 100%);
        }
        .border-primary-subtle {
          border-color: #b3d9ff !important;
        }
        .cursor-pointer {
          cursor: pointer;
        }
        .rotate-90 {
          transform: rotate(90deg);
        }
        .file-tree .position-relative:hover .hover-opacity-100 {
          opacity: 1 !important;
        }
      `}</style>
    </div>
  );
}

export default DocumentsTab;