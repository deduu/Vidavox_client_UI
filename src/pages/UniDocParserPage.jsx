// src/pages/UniDocParserPage.jsx
import React, { useState, useContext, useMemo } from "react";
import SidebarLayout from "../components/SidebarLayout";
import { AuthContext } from "../contexts/AuthContext";
import { useLocation } from "react-router-dom";

// Custom hooks
import { useFolderTree } from "../hooks/useFolderTree";
import { useExtractionSession } from "../hooks/useExtractionSession";
import { usePersistedTab } from "../hooks/usePersistedTab";

// Components
import UploadConfigPanel from "../components/UniDocParser/UploadConfigPanel";
import ResultsViewer from "../components/UniDocParser/ResultsViewer";
import HelpPanel from "../components/UniDocParser/HelpPanel";

// Utils
import { flattenAllNodes } from "../utils/tree";
import { THEME } from "../constants/theme";

const MAX_FILE_SIZE_MB = 200;

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

  // Update destination when folder list changes
  React.useEffect(() => {
    if (!destinationId && folderList.length > 0) {
      setDestinationId(defaultFolderFromNav || folderList[0]?.id);
    }
  }, [folderList.length, destinationId, defaultFolderFromNav]);

  const handleExtractionStart = React.useCallback(() => {
    if (!destinationId) {
      console.warn("No destination selected");
      return;
    }
    startExtraction();
  }, [destinationId, startExtraction]);

  return (
    <SidebarLayout>
      <div className={`flex-1 flex flex-col min-h-0 ${THEME.pageBg}`}>
        {/* Header */}
        {/* <header className="relative overflow-hidden">
          <div className="relative z-10 max-w-7xl mx-auto px-4 py-6">
            <div className="flex justify-between items-center">
              <div className="space-y-1">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  Universal Document Parser
                </h1>
                <p className="text-lg text-gray-600 font-light">
                  Transform your documents with AI-powered extraction
                </p>
              </div>
            </div>
          </div>
        </header> */}

        {/* Main Content */}
        <main className="flex-1 min-h-0 h-full flex flex-col">
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-8 flex-1 min-h-0 items-stretch">
            {/* Left Panel: Upload & Configure */}
            {!viewerFull && (
              <div className="xl:col-span-1 h-full min-h-0 flex flex-col">
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
                  onReset={resetSession}
                  maxFileSizeMB={MAX_FILE_SIZE_MB}
                  className="h-full"
                />
              </div>
            )}

            {/* Right Panel: Results or Help */}
            {/* Right Panel: Always show ResultsViewer */}
            <div
              className={`${
                viewerFull ? "xl:col-span-4" : "xl:col-span-3"
              } h-full min-h-0 flex flex-col`}
            >
              <ResultsViewer
                file={file}
                result={result}
                isCompleted={isCompleted}
                extractionOptions={extractionOptions}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                isFullscreen={viewerFull}
                onToggleFullscreen={() => setViewerFull((v) => !v)}
                className="h-full"
              />
            </div>
          </div>
        </main>
      </div>
    </SidebarLayout>
  );
}
