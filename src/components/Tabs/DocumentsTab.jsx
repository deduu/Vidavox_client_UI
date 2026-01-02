import React, { useRef, useState, useEffect } from "react";
import { Folder, File, Upload, Plus, Search, MoreVertical, FolderOpen, Send, MessageSquare, Bot, User, Check } from "lucide-react";
import { api } from "../../services/api";

function DocumentsTab() {
  const fileInputRef = useRef(null);
  const chatEndRef = useRef(null);
  const [selectedFolderId, setSelectedFolderId] = useState(null);
  const [selectedFolderForAI, setSelectedFolderForAI] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState("");
  const [fileTree, setFileTree] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const [query, setQuery] = useState("");
  
  // Chat interface states
  const [chatMessages, setChatMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showChat, setShowChat] = useState(false);

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

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatEndRef.current && showChat) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, showChat]);

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

  const getFolderName = (folderId) => {
    const findFolder = (items) => {
      for (const item of items) {
        if (item.id === folderId && item.type === 'folder') {
          return item.name;
        }
        if (item.children) {
          const found = findFolder(item.children);
          if (found) return found;
        }
      }
      return null;
    };
    return findFolder(fileTree) || "Unknown Folder";
  };

  const handleSendMessage = async () => {
    if (!currentMessage.trim() || !selectedFolderForAI) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: currentMessage,
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, userMessage]);
    setCurrentMessage("");
    setIsAnalyzing(true);

    // Simulate AI response (replace with actual API call)
    try {
      // This would be your actual API call to analyze documents
      // const response = await api.analyzeDocuments(selectedFolderForAI, currentMessage);
      
      // Simulated response for demo
      setTimeout(() => {
        const aiMessage = {
          id: Date.now() + 1,
          type: 'ai',
          content: `I've analyzed the documents in "${getFolderName(selectedFolderForAI)}" based on your query: "${userMessage.content}". Here are my findings:\n\n• Found 3 relevant documents\n• Identified 2 key patterns\n• No inconsistencies detected\n\nWould you like me to provide more detailed analysis on any specific aspect?`,
          timestamp: new Date()
        };
        setChatMessages(prev => [...prev, aiMessage]);
        setIsAnalyzing(false);
      }, 2000);
    } catch (err) {
      const errorMessage = {
        id: Date.now() + 1,
        type: 'ai',
        content: `Sorry, I encountered an error while analyzing the documents: ${err.message}`,
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, errorMessage]);
      setIsAnalyzing(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const startNewChat = () => {
    setChatMessages([]);
    setShowChat(true);
  };

  const handleCreateFolder = async () => {
    const folderName = prompt("Enter new folder name:");
    if (!folderName) return;
    
    try {
      const parentId = selectedFolderId || null;
      await api.createFolder(folderName, parentId);
      
      // Force a complete refresh
      setLoading(true);
      const tree = await api.listTree();
      setFileTree(tree);
      setLoading(false);
      
      // Auto-expand the parent folder if it exists
      if (parentId) {
        setExpandedFolders(prev => new Set([...prev, parentId]));
      }
      
      console.log("Folder created and tree refreshed");
    } catch (err) {
      console.error("Failed to create folder:", err.message);
      alert(`Failed to create folder: ${err.message}`);
      setLoading(false);
    }
  };

  const renderFileTreeItem = (item, depth = 0) => {
    const isFolder = item.type === 'folder';
    const isExpanded = expandedFolders.has(item.id);
    const hasChildren = item.children && item.children.length > 0;
    const isSelectedForUpload = selectedFolderId === item.id;
    const isSelectedForAI = selectedFolderForAI === item.id;

    return (
      <div key={item.id} className="w-100">
        <div
          className={`d-flex align-items-center py-2 px-3 rounded cursor-pointer position-relative ${
            isSelectedForUpload 
              ? 'bg-primary bg-opacity-10 border-start border-primary border-3' 
              : isSelectedForAI
              ? 'bg-success bg-opacity-10 border-start border-success border-3'
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
            if (!isSelectedForUpload && !isSelectedForAI) {
              e.currentTarget.style.backgroundColor = '#f8f9fa';
            }
          }}
          onMouseLeave={(e) => {
            if (!isSelectedForUpload && !isSelectedForAI) {
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
            {isSelectedForAI && (
              <Check className="text-success ms-2" size={14} />
            )}
          </div>
          {isFolder && (
            <div className="d-flex gap-1">
              <button 
                className="btn btn-sm p-1 opacity-75 hover-opacity-100 border-0"
                style={{ transition: 'opacity 0.2s' }}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedFolderForAI(item.id);
                }}
                title="Select for AI Analysis"
              >
                <Bot size={12} className={isSelectedForAI ? "text-success" : "text-muted"} />
              </button>
              <button 
                className="btn btn-sm p-1 opacity-75 hover-opacity-100 border-0"
                style={{ transition: 'opacity 0.2s' }}
              >
                <MoreVertical size={12} className="text-muted" />
              </button>
            </div>
          )}
        </div>
        
        {isFolder && isExpanded && hasChildren && (
          <div className="ms-2">
            {item.children.map(child => renderFileTreeItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const filterTree = (items, term) => {
  if (!term) return items;                      // no search → return original tree

  const lower = term.toLowerCase();

  return items
    .map(item => {
      // Recurse into children first
      const children = item.children ? filterTree(item.children, term) : [];

      // Should we keep this node?
      const selfMatch     = item.name.toLowerCase().includes(lower);
      const childrenMatch = children.length > 0;

      if (selfMatch || childrenMatch) {
        return { ...item, children };           // keep the node (with its matched child branch)
      }
      return null;                              // drop it
    })
    .filter(Boolean);                           // remove nulls
};

const filteredTree = React.useMemo(
  () => filterTree(fileTree, searchTerm),
  [fileTree, searchTerm]
);


  // const filteredTree = fileTree.filter(item =>
  //   item.name && item.name.toLowerCase().includes(searchTerm.toLowerCase())
  // );

  const renderChatMessage = (message) => {
    const isUser = message.type === 'user';
    return (
      <div key={message.id} className={`d-flex mb-4 ${isUser ? 'justify-content-end' : 'justify-content-start'}`}>
        <div className={`d-flex ${isUser ? 'flex-row-reverse' : 'flex-row'} align-items-start`} style={{ maxWidth: '80%' }}>
          <div className={`rounded-circle d-flex align-items-center justify-content-center ${
            isUser ? 'bg-primary ms-3' : 'bg-success me-3'
          }`} style={{ width: '36px', height: '36px', flexShrink: 0 }}>
            {isUser ? (
              <User className="text-white" size={18} />
            ) : (
              <Bot className="text-white" size={18} />
            )}
          </div>
          <div className={`p-3 rounded-3 ${
            isUser 
              ? 'bg-primary text-white' 
              : 'bg-light border'
          }`} style={{ wordBreak: 'break-word' }}>
            <div className="mb-1" style={{ whiteSpace: 'pre-wrap' }}>
              {message.content}
            </div>
            <small className={`${isUser ? 'text-white-50' : 'text-muted'}`}>
              {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </small>
          </div>
        </div>
      </div>
    );
  };

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
                  <button 
                    className="btn btn-outline-primary btn-sm rounded-pill"
                    onClick={handleCreateFolder}
                  >
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

                {/* AI Selection Info */}
                {selectedFolderForAI && (
                  <div className="mt-3 p-2 bg-success bg-opacity-10 rounded border border-success border-opacity-25">
                    <div className="d-flex align-items-center">
                      <Bot className="text-success me-2" size={16} />
                      <small className="text-success fw-medium">
                        AI analyzing: {getFolderName(selectedFolderForAI)}
                      </small>
                    </div>
                  </div>
                )}
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
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <h4 className="fw-semibold text-dark mb-1">
                      <i className="fas fa-analytics text-primary me-2"></i>
                      Document Analysis
                    </h4>
                    <p className="text-muted small mb-0">Run cross-checks and analysis on your documents</p>
                  </div>
                  <button
                    onClick={startNewChat}
                    className="btn btn-primary d-flex align-items-center"
                    disabled={!selectedFolderForAI}
                  >
                    <MessageSquare size={16} className="me-2" />
                    Start Chat
                  </button>
                </div>
              </div>

              <div className="card-body p-4">
                {!showChat ? (
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
                          disabled={!query.trim() || !selectedFolderForAI}
                          className="btn btn-primary flex-fill d-flex align-items-center justify-content-center py-3"
                          onClick={() => {
                            setCurrentMessage(query);
                            setShowChat(true);
                            setTimeout(() => handleSendMessage(), 100);
                          }}
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
                              Getting Started
                            </h6>
                            <p className="small text-info mb-2">
                              1. Click the <Bot size={14} className="mx-1" /> icon next to a folder to select it for AI analysis
                            </p>
                            <p className="small text-info mb-0">
                              2. Use "Start Chat" for interactive analysis or enter a query above for one-time analysis
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Chat Interface */
                  <div className="chat-container" style={{ height: '500px' }}>
                    {/* Chat Header */}
                    <div className="d-flex justify-content-between align-items-center mb-3 pb-3 border-bottom">
                      <div className="d-flex align-items-center">
                        <Bot className="text-success me-2" size={20} />
                        <span className="fw-medium">AI Assistant</span>
                        {selectedFolderForAI && (
                          <span className="badge bg-success bg-opacity-10 text-success ms-2">
                            {getFolderName(selectedFolderForAI)}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => setShowChat(false)}
                        className="btn btn-outline-secondary btn-sm"
                      >
                        Back to Analysis
                      </button>
                    </div>

                    {/* Chat Messages */}
                    <div className="chat-messages" style={{ height: '380px', overflowY: 'auto' }}>
                      {chatMessages.length === 0 ? (
                        <div className="text-center text-muted py-5">
                          <Bot size={48} className="text-black-50 mb-3" />
                          <p className="mb-0">Start a conversation about your documents</p>
                        </div>
                      ) : (
                        <>
                          {chatMessages.map(renderChatMessage)}
                          {isAnalyzing && (
                            <div className="d-flex justify-content-start mb-4">
                              <div className="d-flex align-items-start">
                                <div className="bg-success rounded-circle d-flex align-items-center justify-content-center me-3" 
                                     style={{ width: '36px', height: '36px' }}>
                                  <Bot className="text-white" size={18} />
                                </div>
                                <div className="bg-light border p-3 rounded-3">
                                  <div className="d-flex align-items-center">
                                    <div className="spinner-border spinner-border-sm text-success me-2" role="status">
                                      <span className="visually-hidden">Analyzing...</span>
                                    </div>
                                    <span className="text-muted">Analyzing documents...</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                      <div ref={chatEndRef} />
                    </div>

                    {/* Chat Input */}
                    <div className="chat-input mt-3 pt-3 border-top">
                      <div className="d-flex gap-2">
                        <textarea
                          value={currentMessage}
                          onChange={(e) => setCurrentMessage(e.target.value)}
                          onKeyPress={handleKeyPress}
                          className="form-control"
                          rows={2}
                          placeholder="Ask about your documents..."
                          disabled={isAnalyzing || !selectedFolderForAI}
                          style={{ resize: 'none' }}
                        />
                        <button
                          onClick={handleSendMessage}
                          disabled={!currentMessage.trim() || isAnalyzing || !selectedFolderForAI}
                          className="btn btn-primary px-3"
                          style={{ height: 'fit-content' }}
                        >
                          <Send size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
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
        .chat-messages::-webkit-scrollbar {
          width: 6px;
        }
        .chat-messages::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 3px;
        }
        .chat-messages::-webkit-scrollbar-thumb {
          background: #c1c1c1;
          border-radius: 3px;
        }
        .chat-messages::-webkit-scrollbar-thumb:hover {
          background: #a8a8a8;
        }
      `}</style>
    </div>
  );
}

export default DocumentsTab;