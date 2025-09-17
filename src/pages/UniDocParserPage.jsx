// src/pages/UniDocParserPage.jsx
import React, { useState, useContext, useMemo, useEffect } from "react";
import SidebarLayout from "../components/SidebarLayout";
import { AuthContext } from "../contexts/AuthContext";
import { useLocation } from "react-router-dom";
import { getJobs, getJobSummary, deleteJob } from "../services/api";
// Custom hooks
import { useFolderTree } from "../hooks/useFolderTree";
import { useExtractionSession } from "../hooks/useExtractionSession";
import { usePersistedTab } from "../hooks/usePersistedTab";

// Components
import UploadConfigPanel from "../components/UniDocParser/UploadConfigPanel";
import ResultsViewer from "../components/UniDocParser/ResultsViewer";
import HelpPanel from "../components/UniDocParser/HelpPanel";
import JobsTable from "../components/UniDocParser/JobsTable";

// Utils
import { flattenAllNodes } from "../utils/tree";
import { THEME } from "../constants/theme";

const MAX_FILE_SIZE_MB = 20;

export default function UniDocParserPage() {
  const { user } = useContext(AuthContext);
  const location = useLocation();

  // Folder management
  const { tree, loading: loadingTree } = useFolderTree();
  const defaultFolderFromNav = location.state?.defaultFolderId || null;

  const folderList = useMemo(() => {
    const all = flattenAllNodes(tree || []);
    return all
      .filter((n) => n.type === "folder")
      .map((n) => ({ id: n.id, name: n.name, path: n.path || n.name }));
  }, [tree]);

  // Destination selection
  const [destinationId, setDestinationId] = useState(
    () => defaultFolderFromNav || folderList[0]?.id
  );

  // Tab management
  const { activeTab, setActiveTab } = usePersistedTab("summary");
  const [viewerFull, setViewerFull] = React.useState(false);
  const [viewMode, setViewMode] = useState("split"); // "split", "upload", "results"

  // Left panel state management
  const [leftPanelTab, setLeftPanelTab] = useState("upload"); // "upload", "history"

  // Extraction session management
  const {
    file,
    result,
    progress,
    error,
    isCompleted,
    showViewer,
    extractionOptions,
    handleFileSelect,
    startExtraction,
    resetSession,
    updateExtractionOptions,
  } = useExtractionSession(destinationId);

  // Job management
  const [jobs, setJobs] = useState([]);
  const [selectedJobResult, setSelectedJobResult] = useState(null);
  const [loadingJob, setLoadingJob] = useState(false);

  useEffect(() => {
    getJobs()
      .then(setJobs)
      .catch((err) => console.error("Failed to load jobs", err));
  }, []);

  const handleSelectJob = async (job) => {
    setLoadingJob(true);
    try {
      const summary = await getJobSummary(job.id);
      setSelectedJobResult(summary);
      // Auto-switch to results view on mobile
      if (window.innerWidth < 1024) {
        setViewMode("results");
      }
      setActiveTab("summary");
    } catch (err) {
      console.error("Error fetching job result:", err);
    } finally {
      setLoadingJob(false);
    }
  };
  const handleDeleteJobs = async (ids) => {
    try {
      await Promise.all(ids.map((id) => deleteJob(id)));
      setJobs((prev) => prev.filter((job) => !ids.includes(job.id)));
    } catch (err) {
      alert("Failed to delete job(s): " + err.message);
    }
  };

  // Update destination when folder list changes
  useEffect(() => {
    if (!destinationId && folderList.length > 0) {
      setDestinationId(defaultFolderFromNav || folderList[0]?.id);
    }
  }, [folderList.length, destinationId, defaultFolderFromNav]);

  const handleExtractionStart = React.useCallback(() => {
    if (!destinationId) {
      console.warn("No destination selected");
      return;
    }
    setSelectedJobResult(null);
    startExtraction();
    // Auto-switch to results view
    if (window.innerWidth < 1024) {
      setViewMode("results");
    }
  }, [destinationId, startExtraction]);

  const handleReset = React.useCallback(() => {
    resetSession();
    setSelectedJobResult(null);
  }, [resetSession]);

  const hasActiveSession = file || result || selectedJobResult || progress > 0;

  return (
    <SidebarLayout>
      <div className={`flex-1 flex flex-col min-h-0 ${THEME.pageBg}`}>
        {/* Main Content Area */}
        <main className="flex-1 min-h-0 overflow-hidden">
          <div className="h-full flex">
            {/* Left Panel - Hidden when viewerFull is true */}
            <div
              className={`
              ${viewerFull ? "hidden" : ""}
              ${
                viewMode === "results" && window.innerWidth < 1024
                  ? "hidden"
                  : ""
              }
              ${viewMode === "split" ? "w-96" : "flex-1"}
              ${viewMode === "upload" ? "lg:w-96" : ""}
              flex-shrink-0 border-r border-gray-200 bg-white flex flex-col
            `}
            >
              {/* Left Panel Tabs */}
              <div className="flex-shrink-0 border-b border-gray-200">
                <nav className="flex -mb-px" aria-label="Tabs">
                  <button
                    onClick={() => setLeftPanelTab("upload")}
                    className={`w-1/2 py-3 px-4 text-center border-b-2 font-medium text-sm transition-colors ${
                      leftPanelTab === "upload"
                        ? "border-blue-500 text-blue-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center justify-center">
                      <svg
                        className="w-4 h-4 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                        />
                      </svg>
                      Upload
                    </div>
                  </button>
                  <button
                    onClick={() => setLeftPanelTab("history")}
                    className={`w-1/2 py-3 px-4 text-center border-b-2 font-medium text-sm transition-colors ${
                      leftPanelTab === "history"
                        ? "border-blue-500 text-blue-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center justify-center">
                      <svg
                        className="w-4 h-4 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      History ({jobs.length})
                    </div>
                  </button>
                </nav>
              </div>

              {/* Tab Content */}
              <div className="flex-1 min-h-0 overflow-hidden">
                {leftPanelTab === "upload" && (
                  <div className="p-6">
                    <UploadConfigPanel
                      file={file}
                      folderList={folderList}
                      loadingTree={loadingTree}
                      destinationId={destinationId}
                      setDestinationId={setDestinationId}
                      extractionOptions={extractionOptions}
                      updateExtractionOptions={updateExtractionOptions}
                      progress={progress}
                      error={error}
                      onFileSelect={handleFileSelect}
                      onStartExtraction={handleExtractionStart}
                      onReset={handleReset}
                      maxFileSizeMB={MAX_FILE_SIZE_MB}
                    />
                  </div>
                )}

                {leftPanelTab === "history" && (
                  <div className="h-full flex flex-col">
                    {/* Status Banner */}
                    {selectedJobResult && (
                      <div className="flex-shrink-0 mx-4 mt-4 mb-2">
                        <div className="bg-blue-50 border border-blue-200 p-3">
                          <div className="flex items-center">
                            <svg
                              className="w-5 h-5 text-blue-600 mr-2"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                clipRule="evenodd"
                              />
                            </svg>
                            <div>
                              <p className="text-sm font-medium text-blue-900">
                                Job Selected
                              </p>
                              <p className="text-xs text-blue-700">
                                Viewing previous extraction results
                              </p>
                            </div>
                            <button
                              onClick={() => setSelectedJobResult(null)}
                              className="ml-auto text-blue-400 hover:text-blue-600"
                            >
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
                                  d="M6 18L18 6M6 6l12 12"
                                />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Jobs Table */}
                    <div className="flex-1 min-h-0 overflow-hidden">
                      <JobsTable
                        jobs={jobs}
                        onSelectJob={handleSelectJob}
                        onDeleteJobs={handleDeleteJobs}
                      />
                      ;
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Panel - Results */}
            <div
              className={`
              ${
                !viewerFull && viewMode === "upload" && window.innerWidth < 1024
                  ? "hidden"
                  : ""
              }
              flex-1 min-h-0 bg-gray-50 flex flex-col
            `}
            >
              {/* Results or Welcome State */}
              {hasActiveSession ? (
                <ResultsViewer
                  file={file}
                  result={selectedJobResult || result}
                  isCompleted={isCompleted || !!selectedJobResult}
                  extractionOptions={extractionOptions}
                  activeTab={activeTab}
                  onTabChange={setActiveTab}
                  isFullscreen={viewerFull}
                  onToggleFullscreen={() => setViewerFull(!viewerFull)}
                  className="h-full"
                />
              ) : (
                <WelcomeState onGetStarted={() => setLeftPanelTab("upload")} />
              )}
            </div>
          </div>
        </main>
      </div>
    </SidebarLayout>
  );
}

// Welcome State Component
function WelcomeState({ onGetStarted }) {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600  mx-auto mb-6 flex items-center justify-center shadow-lg">
          <svg
            className="w-10 h-10 text-white"
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

        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Ready to Process Documents
        </h2>

        <p className="text-gray-600 mb-8 leading-relaxed">
          Upload your documents to extract text, analyze content, and generate
          insights using AI-powered processing.
        </p>

        <div className="space-y-4">
          <button
            onClick={onGetStarted}
            className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-medium py-3 px-6 transition-all duration-200 transform hover:scale-105 shadow-lg"
          >
            Get Started
          </button>

          <div className="grid grid-cols-3 gap-4 text-center text-sm text-gray-500 pt-6 border-t border-gray-200">
            <div>
              <svg
                className="w-8 h-8 mx-auto mb-2 text-blue-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <span>Upload</span>
            </div>
            <div>
              <svg
                className="w-8 h-8 mx-auto mb-2 text-green-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
              <span>Process</span>
            </div>
            <div>
              <svg
                className="w-8 h-8 mx-auto mb-2 text-purple-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              <span>Analyze</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
