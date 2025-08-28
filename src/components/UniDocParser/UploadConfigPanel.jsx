// src/components/UniDocParser/UploadConfigPanel.jsx
import React, { useRef, useCallback } from "react";
import { THEME } from "../../constants/theme";
import ToggleRow from "./ToggleRow";
import ProgressIndicator from "./ProgressIndicator";
import FileDropZone from "./FileDropZone";
import { validateFile } from "../../utils/fileValidation";

export default function UploadConfigPanel({
  file,
  folderList,
  loadingTree,
  destinationId,
  setDestinationId,
  extractionOptions,
  updateExtractionOptions,
  progress, // { visible, pct, label, subLabel }
  error,
  onFileSelect,
  onStartExtraction,
  onReset,
  maxFileSizeMB,
}) {
  const fileInputRef = useRef(null);

  // Check if this is a placeholder file (restored from session but no actual content)
  const isPlaceholderFile = file && file.size === 0;

  const handleFileChange = useCallback(
    (selectedFile) => {
      const validationError = validateFile(selectedFile, maxFileSizeMB);
      onFileSelect(selectedFile, validationError);
    },
    [onFileSelect, maxFileSizeMB]
  );

  const handleBrowseClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileInputChange = useCallback(
    (e) => {
      const selectedFile = e.target.files?.[0];
      if (selectedFile) handleFileChange(selectedFile);
    },
    [handleFileChange]
  );

  const handleExtractionOptionChange = useCallback(
    (key, value) => updateExtractionOptions({ [key]: value }),
    [updateExtractionOptions]
  );

  const canStartExtraction =
    !!file && !!destinationId && !progress.visible && !isPlaceholderFile;

  return (
    <div
      className={`${THEME.glass} rounded-xl shadow-sm overflow-hidden h-full flex flex-col min-h-[720px]`}
    >
      {/* Header */}
      <div
        className={`${THEME.sectionHeader} px-6 py-4 border-b border-gray-100/60`}
      >
        <h2 className="text-lg font-semibold text-gray-800 flex items-center">
          <span className="mr-3 inline-flex w-8 h-8 items-center justify-center bg-white/80 rounded">
            ⬆️
          </span>
          Upload & Configure
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          Start by selecting your file & destination
        </p>
      </div>

      <div className="p-6 space-y-6 flex-1 flex flex-col">
        {/* Destination Picker */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Destination Folder
          </label>
          <select
            disabled={loadingTree || folderList.length === 0}
            value={destinationId || ""}
            onChange={(e) => setDestinationId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed"
          >
            {loadingTree && <option>Loading folders...</option>}
            {!loadingTree && folderList.length === 0 && (
              <option>No folders available</option>
            )}
            {!loadingTree &&
              folderList.map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {folder.path}
                </option>
              ))}
          </select>
          <p className="text-xs text-gray-500 mt-2">
            Files will be uploaded under the selected folder.
          </p>
        </div>

        {/* Session Recovery Notice */}
        {isPlaceholderFile && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center space-x-2">
              <span className="text-blue-500">ℹ️</span>
              <div>
                <h3 className="text-sm font-medium text-blue-800">
                  Session Restored
                </h3>
                <p className="text-xs text-blue-600 mt-1">
                  File "{file?.name}" was restored from your previous session.
                  To start a new extraction, please select the file again.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* File Drop Zone */}
        <FileDropZone
          file={file}
          onFileSelect={handleFileChange}
          onBrowseClick={handleBrowseClick}
          maxFileSizeMB={maxFileSizeMB}
          disabled={progress.visible}
          isPlaceholder={isPlaceholderFile}
        />

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.xls,.xlsx"
          className="hidden"
          onChange={handleFileInputChange}
        />

        {/* Extraction Options */}
        {file && !isPlaceholderFile && (
          <div className="space-y-6">
            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={onStartExtraction}
                disabled={!canStartExtraction}
                className={`w-full font-bold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-[1.02] shadow-sm hover:shadow-md flex items-center justify-center space-x-2 ${
                  canStartExtraction
                    ? THEME.primaryBtn
                    : "bg-gray-300 cursor-not-allowed text-white"
                }`}
              >
                <span className="text-xl">✨</span>
                <span className="text-lg">
                  {!destinationId
                    ? "Select Destination First"
                    : progress.visible
                    ? "Processing..."
                    : isPlaceholderFile
                    ? "Please Reselect File"
                    : "Start Extraction"}
                </span>
              </button>

              <button
                onClick={onReset}
                disabled={progress.visible}
                className="w-full bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed text-gray-800 font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                Reset / New File
              </button>
            </div>

            {/* Error Display */}
            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                {error}
              </div>
            )}
          </div>
        )}

        {/* Show buttons even for placeholder files */}
        {isPlaceholderFile && (
          <div className="space-y-3">
            <button
              onClick={handleBrowseClick}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-[1.02] shadow-sm hover:shadow-md flex items-center justify-center space-x-2"
            >
              <span className="text-xl">📁</span>
              <span className="text-lg">Select File to Continue</span>
            </button>

            <button
              onClick={onReset}
              className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              Reset Session
            </button>

            {/* Error Display */}
            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                {error}
              </div>
            )}
          </div>
        )}

        {/* Progress Indicator */}
        {progress.visible && (
          <div className="pt-2">
            <ProgressIndicator
              percentage={progress.pct ?? 0}
              label={progress.label || "Processing..."}
              subtitle={progress.subLabel || ""}
            />
          </div>
        )}
      </div>
    </div>
  );
}
