import React, { useMemo, useState } from "react";
import FileUpload from "./FileUpload"; // using your component as the dropzone/picker
import { extractPdf, uploadFiles } from "../services/api";
import ExtractResultsDrawer from "./ExtractResultsDrawer";

// folderList: [{id, name, path?}] provided by Dashboard (flattened folders)
// maxFiles: number limit for a batch

export default function IngestPanel({
  defaultFolderId,
  folderList = [],
  maxFiles = 5,
  onTreeRefresh,
}) {
  const [pickedFiles, setPickedFiles] = useState([]);
  const [createEmbeddings, setCreateEmbeddings] = useState(true);
  const [destFolderId, setDestFolderId] = useState(defaultFolderId || null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [resultsOpen, setResultsOpen] = useState(false);
  const [resultsItems, setResultsItems] = useState([]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [options, setOptions] = useState({
    extract_text: true,
    extract_tables: true,
    extract_images: false,
    page_numbers: [],
  });

  // Update dest if parent changes selection
  React.useEffect(() => {
    if (defaultFolderId !== undefined) setDestFolderId(defaultFolderId || null);
  }, [defaultFolderId]);

  // Clear messages after some time
  React.useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(""), 4000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  React.useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(""), 6000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // De-dup + limit files
  function pushFiles(newFiles) {
    const key = (f) => `${f.name}::${f.size}`;
    setPickedFiles((prev) => {
      const map = new Map(prev.map((f) => [key(f), f]));
      for (const f of newFiles) {
        if (map.size >= maxFiles) break;
        map.set(key(f), f);
      }
      return Array.from(map.values()).slice(0, maxFiles);
    });
  }

  function onPick(fileOrFiles) {
    const list = Array.isArray(fileOrFiles) ? fileOrFiles : [fileOrFiles];
    const remaining = maxFiles - pickedFiles.length;
    if (remaining <= 0) {
      setError(`Limit reached: maximum ${maxFiles} file(s) per batch.`);
      return;
    }
    const slice = list.slice(0, remaining);
    pushFiles(slice);
    setError("");
    setSuccess(
      `Added ${slice.length} file${slice.length > 1 ? "s" : ""} to batch`
    );
  }

  function removeFile(name, size) {
    setPickedFiles((prev) =>
      prev.filter((f) => !(f.name === name && f.size === size))
    );
  }

  const canRun = pickedFiles.length > 0;

  async function run() {
    if (!canRun) return;

    if (createEmbeddings && !destFolderId) {
      setError("Please choose a destination folder before processing files.");
      return;
    }

    setBusy(true);
    setError("");
    setSuccess("");

    try {
      if (createEmbeddings) {
        await uploadFiles(pickedFiles, destFolderId);
        onTreeRefresh?.();
        setPickedFiles([]);
        setSuccess("Files successfully uploaded and indexed!");
      } else {
        const items = [];
        for (const file of pickedFiles) {
          const res = await extractPdf({
            file,
            options,
            folderId: destFolderId || undefined,
          });

          // Create a blob URL for compare tab (optional)
          const blobUrl = URL.createObjectURL(file);
          items.push({ fileName: file.name, blobUrl, result: res });
        }
        setResultsItems(items);
        setResultsOpen(true);
        onTreeRefresh?.();
        setPickedFiles([]);
        setSuccess("Text extraction completed successfully!");
      }
    } catch (e) {
      setError(e.message || "Operation failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const parsedRange = useMemo(
    () => (options.page_numbers?.length ? options.page_numbers.join(", ") : ""),
    [options.page_numbers]
  );

  const getFileIcon = (fileName) => {
    const ext = fileName.split(".").pop()?.toLowerCase();
    return (
      <svg
        className="w-4 h-4 text-blue-600"
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
    );
  };

  const getFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <>
      <div className="space-y-6">
        {/* Status Messages */}
        {(error || success) && (
          <div className="space-y-2">
            {error && (
              <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                <svg
                  className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div>
                  <p className="text-sm font-medium text-red-800">Error</p>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            )}
            {success && (
              <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                <svg
                  className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <div>
                  <p className="text-sm font-medium text-green-800">Success</p>
                  <p className="text-sm text-green-700">{success}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 1: Destination Folder */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
              1
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">
                Choose Destination
              </h3>
              <p className="text-sm text-gray-600">
                Select where to store your files
              </p>
            </div>
          </div>
          <DestPicker
            value={destFolderId}
            onChange={setDestFolderId}
            folderList={folderList}
          />
        </div>

        {/* Step 2: File Selection */}
        <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl border border-emerald-200 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-emerald-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
              2
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">Select Files</h3>
              <p className="text-sm text-gray-600">
                Drop files or click to browse ({pickedFiles.length}/{maxFiles}{" "}
                selected)
              </p>
            </div>
          </div>

          <FileUpload
            pickOnly
            folderId={destFolderId}
            onPick={onPick}
            onDropFiles={onPick}
            maxFiles={maxFiles}
          />

          {/* Selected Files List */}
          {pickedFiles.length > 0 && (
            <div className="mt-4 bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                <h4 className="font-medium text-gray-800">Selected Files</h4>
                <button
                  className="text-sm text-gray-600 hover:text-gray-800 font-medium"
                  onClick={() => setPickedFiles([])}
                  disabled={busy}
                >
                  Clear All
                </button>
              </div>
              <div className="max-h-40 overflow-y-auto">
                {pickedFiles.map((f) => (
                  <div
                    key={`${f.name}-${f.size}`}
                    className="flex items-center justify-between p-4 border-b border-gray-100 last:border-b-0 hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {getFileIcon(f.name)}
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-800 truncate">
                          {f.name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {getFileSize(f.size)}
                        </p>
                      </div>
                    </div>
                    <button
                      className="ml-3 p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      onClick={() => removeFile(f.name, f.size)}
                      disabled={busy}
                      title="Remove file"
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
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Step 3: Processing Options */}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
              3
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">
                Processing Options
              </h3>
              <p className="text-sm text-gray-600">
                Configure how files will be processed
              </p>
            </div>
          </div>

          {/* Processing Mode Toggle */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-medium text-gray-800 mb-1">
                  Processing Mode
                </h4>
                <p className="text-sm text-gray-600">
                  {createEmbeddings
                    ? "Files will be processed, indexed, and stored for AI search and chat"
                    : "Files will be processed for text extraction only (preview mode)"}
                </p>
              </div>
              <Switch value={createEmbeddings} onChange={setCreateEmbeddings} />
            </div>
          </div>

          {/* Advanced Options */}
          <div className="bg-white rounded-lg border border-gray-200">
            <button
              className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              <div className="flex items-center gap-3">
                <svg
                  className="w-5 h-5 text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <span className="font-medium text-gray-800">
                  Advanced Extraction Settings
                </span>
              </div>
              <div
                className={`transform transition-transform ${
                  showAdvanced ? "rotate-180" : ""
                }`}
              >
                <svg
                  className="w-5 h-5 text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            </button>

            {showAdvanced && (
              <div className="px-4 pb-4 space-y-4 border-t border-gray-100">
                <div className="grid grid-cols-1 gap-3 pt-4">
                  <ExtractionToggle
                    icon={
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
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                    }
                    label="Extract Text"
                    description="Extract readable text content from documents"
                    checked={options.extract_text}
                    onChange={(v) =>
                      setOptions((o) => ({ ...o, extract_text: v }))
                    }
                  />
                  <ExtractionToggle
                    icon={
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
                          d="M3 10h18M3 14h18m-9-4v8m-7 0V4a1 1 0 011-1h3M2 3h6l2 2h6a1 1 0 011 1v11a1 1 0 01-1 1H3a1 1 0 01-1-1V3z"
                        />
                      </svg>
                    }
                    label="Extract Tables"
                    description="Identify and extract structured table data"
                    checked={options.extract_tables}
                    onChange={(v) =>
                      setOptions((o) => ({ ...o, extract_tables: v }))
                    }
                  />
                  <ExtractionToggle
                    icon={
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
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                    }
                    label="Extract Images"
                    description="Extract and process embedded images"
                    checked={options.extract_images}
                    onChange={(v) =>
                      setOptions((o) => ({ ...o, extract_images: v }))
                    }
                  />
                </div>

                <div className="pt-3 border-t border-gray-100">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Page Range (Optional)
                  </label>
                  <PageRangeInput
                    value={options.page_numbers}
                    onChange={(arr) =>
                      setOptions((o) => ({ ...o, page_numbers: arr }))
                    }
                  />
                  {parsedRange && (
                    <p className="text-xs text-gray-500 mt-2 px-3 py-1.5 bg-blue-50 rounded border border-blue-200">
                      Selected pages:{" "}
                      <span className="font-medium text-blue-800">
                        {parsedRange}
                      </span>
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center justify-center pt-2">
          <button
            onClick={run}
            disabled={!canRun || busy}
            className={`
              inline-flex items-center gap-3 px-8 py-4 rounded-xl font-semibold text-white text-lg
              transition-all duration-200 transform hover:scale-105 disabled:scale-100
              ${
                canRun && !busy
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl"
                  : "bg-gray-400 cursor-not-allowed shadow-none"
              }
            `}
          >
            {busy ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {createEmbeddings
                  ? "Processing & Indexing..."
                  : "Extracting Content..."}
              </>
            ) : (
              <>
                <svg
                  className="w-5 h-5"
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
                {createEmbeddings
                  ? "Process & Index Files"
                  : "Extract Content Only"}
              </>
            )}
          </button>
        </div>

        {/* Help Text */}
        <div className="text-center text-sm text-gray-500 space-y-1">
          <p>
            {createEmbeddings
              ? "Files will be processed, indexed, and ready for AI-powered search and chat"
              : "Files will be processed for content extraction and preview only"}
          </p>
          {!createEmbeddings && (
            <p className="text-xs">
              Enable "Processing Mode" above to store files permanently and
              create embeddings
            </p>
          )}
        </div>
      </div>

      {/* Results Drawer */}
      <ExtractResultsDrawer
        open={resultsOpen}
        onClose={() => {
          resultsItems.forEach(
            (it) => it.blobUrl && URL.revokeObjectURL(it.blobUrl)
          );
          setResultsOpen(false);
        }}
        items={resultsItems}
      />
    </>
  );
}

/* ---- UI Helper Components ---- */

function Switch({ value, onChange }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`
        relative inline-flex h-6 w-11 items-center rounded-full transition-colors
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        ${value ? "bg-blue-600" : "bg-gray-300"}
      `}
    >
      <span
        className={`
          inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform
          ${value ? "translate-x-6" : "translate-x-1"}
        `}
      />
    </button>
  );
}

function ExtractionToggle({ icon, label, description, checked, onChange }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
      <div className="text-gray-600 mt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        <h5 className="font-medium text-gray-800">{label}</h5>
        <p className="text-xs text-gray-600 mt-0.5">{description}</p>
      </div>
      <Switch value={checked} onChange={onChange} />
    </div>
  );
}

function PageRangeInput({ value, onChange }) {
  const [text, setText] = useState("");

  function parse(str) {
    const out = new Set();
    for (const part of str.split(",").map((s) => s.trim())) {
      if (!part) continue;
      const m = part.match(/^(\d+)\s*-\s*(\d+)$/);
      if (m) {
        let a = +m[1],
          b = +m[2];
        if (a > b) [a, b] = [b, a];
        for (let i = a; i <= b; i++) out.add(i);
      } else if (/^\d+$/.test(part)) {
        out.add(+part);
      }
    }
    return [...out].sort((a, b) => a - b);
  }

  return (
    <input
      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
      placeholder="e.g., 1-3, 5, 7-8 (leave empty for all pages)"
      value={text}
      onChange={(e) => {
        const v = e.target.value;
        setText(v);
        onChange(parse(v));
      }}
    />
  );
}

function DestPicker({ value, onChange, folderList }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredFolders = useMemo(() => {
    if (!searchQuery.trim()) return folderList;
    const query = searchQuery.trim().toLowerCase();
    return folderList.filter((folder) =>
      (folder.path || folder.name).toLowerCase().includes(query)
    );
  }, [searchQuery, folderList]);

  const selectedFolder = folderList.find((f) => f.id === value);

  return (
    <div className="relative">
      <div
        className="bg-white border border-gray-300 rounded-lg p-4 cursor-pointer hover:border-gray-400 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {value ? (
              <svg
                className="w-5 h-5 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z"
                />
              </svg>
            ) : (
              <svg
                className="w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z"
                />
              </svg>
            )}
            <div>
              <p className="font-medium text-gray-800">
                {selectedFolder
                  ? selectedFolder.path || selectedFolder.name
                  : "Inbox (Unsorted)"}
              </p>
              <p className="text-sm text-gray-600">
                {value
                  ? "Custom folder selected"
                  : "Files will be stored in the main inbox"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {value && (
              <button
                className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(null);
                }}
              >
                Use Inbox
              </button>
            )}
            <svg
              className={`w-5 h-5 text-gray-600 transform transition-transform ${
                isOpen ? "rotate-180" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10 max-h-64 overflow-hidden">
          <div className="p-3 border-b border-gray-200">
            <input
              type="text"
              placeholder="Search folders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              autoFocus
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            <button
              className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 border-b border-gray-100"
              onClick={() => {
                onChange(null);
                setIsOpen(false);
                setSearchQuery("");
              }}
            >
              <svg
                className="w-4 h-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z"
                />
              </svg>
              <div>
                <p className="font-medium text-gray-800">Inbox (Unsorted)</p>
                <p className="text-sm text-gray-600">
                  Default storage location
                </p>
              </div>
            </button>
            {filteredFolders.map((folder) => (
              <button
                key={folder.id}
                className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 border-b border-gray-100 last:border-b-0"
                onClick={() => {
                  onChange(folder.id);
                  setIsOpen(false);
                  setSearchQuery("");
                }}
              >
                <svg
                  className="w-4 h-4 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z"
                  />
                </svg>
                <div>
                  <p className="font-medium text-gray-800">{folder.name}</p>
                  {folder.path && folder.path !== folder.name && (
                    <p className="text-sm text-gray-600">{folder.path}</p>
                  )}
                </div>
              </button>
            ))}
            {filteredFolders.length === 0 && searchQuery && (
              <div className="px-4 py-8 text-center text-gray-500">
                <p>No folders found matching "{searchQuery}"</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
