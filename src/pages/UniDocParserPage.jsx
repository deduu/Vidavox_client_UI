// src/pages/AddDocumentPage.jsx
import React, { useEffect, useMemo, useState, useContext, useRef } from "react";
import SidebarLayout from "../components/SidebarLayout";
import { flattenAllNodes } from "../utils/tree";
import { fetchFolderTree } from "../services/api";
import { useLocation } from "react-router-dom";
import { AuthContext } from "../contexts/AuthContext";

/** === Theme to match DashboardPage === */
const theme = {
  pageBg: "bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50",
  glass: "bg-white/60 backdrop-blur-sm border border-white/40",
  sectionHeader: "bg-gradient-to-r from-slate-50/80 to-gray-50/80",
  primaryBtn:
    "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white",
  softBar: "bg-gray-50/40 border-b border-gray-100/60",
};

export default function UniDocParserPage() {
  const { user } = useContext(AuthContext);
  const loc = useLocation();

  // --- Folder tree & destination ---
  const [tree, setTree] = useState([]);
  const [loadingTree, setLoadingTree] = useState(true);

  const defaultFolderFromNav = (loc.state && loc.state.defaultFolderId) || null;
  const folderList = useMemo(() => {
    const all = flattenAllNodes(tree);
    return all
      .filter((n) => n.type === "folder")
      .map((n) => ({ id: n.id, name: n.name, path: n.path || n.name }));
  }, [tree]);

  const [destinationId, setDestinationId] = useState(defaultFolderFromNav);

  // --- Upload / Extract UI states ---
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const [extractText, setExtractText] = useState(true);
  const [extractTables, setExtractTables] = useState(true);
  const [extractImages, setExtractImages] = useState(false);
  const [pageRange, setPageRange] = useState("");

  const [activeTab, setActiveTab] = useState("summary");
  const [currentStep, setCurrentStep] = useState(1);
  const [progressVisible, setProgressVisible] = useState(false);
  const [progressPct, setProgressPct] = useState(0);
  const [statusLabel, setStatusLabel] = useState("Uploading...");
  const [statusSub, setStatusSub] = useState("This may take a few moments");

  const [stats, setStats] = useState({
    pages: 0,
    textBlocks: 0,
    tables: 0,
    time: "0s",
  });

  // NEW: control when the results viewer shows (only after Start Extraction)
  const [showViewer, setShowViewer] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setLoadingTree(true);
        const data = await fetchFolderTree();
        setTree(data);
      } catch (e) {
        console.error("Failed to load folder tree:", e);
      } finally {
        setLoadingTree(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!destinationId && folderList.length > 0) {
      setDestinationId(defaultFolderFromNav || folderList[0]?.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folderList.length]);

  // --- Drag & Drop handlers ---
  const onDragOver = (e) => {
    e.preventDefault();
    setDragActive(true);
  };
  const onDragLeave = (e) => {
    e.preventDefault();
    setDragActive(false);
  };
  const onDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  const handleFile = (f) => {
    setFile(f);
    setCurrentStep(2); // move to Configure
  };

  const onBrowseClick = () => fileInputRef.current?.click();

  // --- Simulated extraction (wire to your backend later) ---
  const startExtraction = async () => {
    if (!file || !destinationId) return;
    setShowViewer(true); // show viewer now
    setCurrentStep(3);
    setProgressVisible(true);
    setStatusLabel("Uploading...");
    setStatusSub("This may take a few moments");
    setProgressPct(0);

    for (let i = 1; i <= 25; i++) {
      await sleep(20);
      setProgressPct((p) => Math.min(100, p + 2));
    }
    setStatusLabel("Processing...");
    for (let i = 1; i <= 25; i++) {
      await sleep(25);
      setProgressPct((p) => Math.min(100, p + 2));
    }

    setStatusLabel("Completed");
    setStatusSub("Your file has been processed");
    setProgressPct(100);

    setStats({
      pages: 12,
      textBlocks: extractText ? 84 : 0,
      tables: extractTables ? 6 : 0,
      time: "8s",
    });

    setCurrentStep(4);
    setActiveTab("summary");
  };

  return (
    <SidebarLayout>
      {/* Page background to match Dashboard */}
      <div className={`min-h-screen ${theme.pageBg}`}>
        {/* Header */}
        <header className="relative overflow-hidden">
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
        </header>

        {/* Stepper */}
        <div className="max-w-7xl mx-auto px-4 py-2">
          <div className="flex justify-center items-center gap-8 mb-6">
            {[
              { id: 1, label: "Upload Files" },
              { id: 2, label: "Configure" },
              { id: 3, label: "Extract" },
              { id: 4, label: "Review" },
            ].map((s) => {
              const active = currentStep === s.id;
              const done = currentStep > s.id;
              return (
                <div key={s.id} className="flex items-center space-x-3">
                  <div
                    className={[
                      "w-10 h-10 rounded-full flex items-center justify-center font-semibold",
                      active
                        ? "bg-blue-600 text-white"
                        : done
                        ? "bg-emerald-500 text-white"
                        : "bg-gray-300 text-gray-600",
                    ].join(" ")}
                  >
                    {s.id}
                  </div>
                  <span
                    className={[
                      "text-sm font-medium",
                      active ? "text-gray-800" : "text-gray-500",
                    ].join(" ")}
                  >
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Main */}
        <main className="max-w-7xl mx-auto px-4 pb-10">
          {/* items-stretch + min-h to align heights */}
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-8 items-stretch">
            {/* Left: Upload & Configure */}
            <div className="xl:col-span-1">
              <div
                className={`${theme.glass} rounded-xl shadow-sm overflow-hidden h-full flex flex-col min-h-[720px]`}
              >
                <div
                  className={`${theme.sectionHeader} px-6 py-4 border-b border-gray-100/60`}
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {loadingTree && <option>Loading folders...</option>}
                      {!loadingTree && folderList.length === 0 && (
                        <option>No folders available</option>
                      )}
                      {!loadingTree &&
                        folderList.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.path}
                          </option>
                        ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-2">
                      Files will be uploaded under the selected folder.
                    </p>
                  </div>

                  {/* Upload Zone */}
                  <div
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    onDrop={onDrop}
                    className={[
                      "flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-300",
                      dragActive
                        ? "bg-gradient-to-br from-blue-100 to-indigo-100 border-blue-400"
                        : "bg-gradient-to-br from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border-blue-300",
                    ].join(" ")}
                    onClick={onBrowseClick}
                  >
                    <div className="flex flex-col items-center justify-center py-8">
                      <div className="mb-4 p-4 bg-white rounded-full shadow">
                        <span className="text-3xl">☁️</span>
                      </div>
                      {!file ? (
                        <>
                          <p className="mb-2 text-lg font-semibold text-gray-700">
                            Drop your file here
                          </p>
                          <p className="text-sm text-gray-500 text-center">
                            or{" "}
                            <span className="text-blue-600 font-medium">
                              browse files
                            </span>
                            <br />
                            PDF/Images/Excel up to 20MB
                          </p>
                        </>
                      ) : (
                        <div className="mt-2 px-4 py-2 bg-white rounded-full text-sm text-blue-600 font-medium shadow">
                          📄 {file.name}
                        </div>
                      )}
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.xls,.xlsx"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleFile(f);
                      }}
                    />
                  </div>

                  {/* Extraction Options (visible after file chosen) */}
                  {file && (
                    <div className="space-y-6">
                      <div className="bg-gradient-to-r from-emerald-50 to-green-50 p-4 rounded-xl border border-green-200">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                          <span className="mr-2">⚙️</span> Extraction Settings
                        </h3>
                        <div className="space-y-4">
                          <ToggleRow
                            label="Extract Text"
                            checked={extractText}
                            onChange={setExtractText}
                            icon="🅰️"
                          />
                          <ToggleRow
                            label="Extract Tables"
                            checked={extractTables}
                            onChange={setExtractTables}
                            icon="📊"
                          />
                          <ToggleRow
                            label="Extract Images"
                            checked={extractImages}
                            onChange={setExtractImages}
                            icon="🖼️"
                          />
                        </div>
                      </div>

                      <div className="bg-white p-4 rounded-xl border border-gray-200">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          📝 Page Range (Optional)
                        </label>
                        <input
                          type="text"
                          value={pageRange}
                          onChange={(e) => setPageRange(e.target.value)}
                          placeholder="e.g., 1-5, 7, 9-10"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <p className="text-xs text-gray-500 mt-2">
                          Leave empty to extract all pages
                        </p>
                      </div>

                      <button
                        onClick={startExtraction}
                        disabled={!destinationId}
                        className={[
                          "w-full font-bold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-[1.02] shadow-sm hover:shadow-md flex items-center justify-center space-x-2",
                          destinationId
                            ? theme.primaryBtn
                            : "bg-gray-300 cursor-not-allowed text-white",
                        ].join(" ")}
                      >
                        <span className="text-xl">✨</span>
                        <span className="text-lg">
                          {destinationId
                            ? "Start Extraction"
                            : "Select Destination First"}
                        </span>
                      </button>
                    </div>
                  )}

                  {/* Progress */}
                  {progressVisible && (
                    <div className="text-center pt-2">
                      <div className="mx-auto w-24 h-24 relative mb-3">
                        <svg viewBox="0 0 36 36" className="w-24 h-24">
                          <path
                            className="text-gray-200"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="none"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          />
                          <path
                            className="text-blue-600"
                            stroke="currentColor"
                            strokeWidth="4"
                            strokeLinecap="round"
                            fill="none"
                            strokeDasharray={`${progressPct}, 100`}
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-2xl font-bold text-gray-700">
                            {progressPct}%
                          </span>
                        </div>
                      </div>

                      <div className="text-blue-600 text-2xl mb-1 animate-spin-slow">
                        ⚙️
                      </div>
                      <p className="text-lg font-medium text-gray-700">
                        {statusLabel}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">{statusSub}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Results / Tabs OR Help (mutually exclusive per your spec) */}
            <div className="xl:col-span-3">
              {/* Results viewer only AFTER Start Extraction */}
              {showViewer ? (
                <div
                  className={`${theme.glass} rounded-xl shadow-sm overflow-hidden h-full min-h-[720px] flex flex-col`}
                >
                  {/* Tabs Header */}
                  <div className={`${theme.softBar}`}>
                    <nav className="flex flex-wrap" aria-label="Tabs">
                      {[
                        { id: "summary", label: "Summary", icon: "📊" },
                        { id: "comparison", label: "Compare", icon: "🧱" },
                        { id: "json", label: "JSON", icon: "🧩" },
                        { id: "markdown", label: "Markdown", icon: "📄" },
                        { id: "preview", label: "Preview", icon: "👁️" },
                      ].map((t) => (
                        <button
                          key={t.id}
                          onClick={() => setActiveTab(t.id)}
                          className={[
                            "flex-1 py-4 px-6 font-semibold text-center transition-all",
                            activeTab === t.id
                              ? "text-blue-600 bg-blue-50"
                              : "text-gray-600 hover:text-blue-600 hover:bg-gray-50",
                          ].join(" ")}
                        >
                          <span className="mr-2">{t.icon}</span>
                          <span className="hidden sm:inline">{t.label}</span>
                        </button>
                      ))}
                    </nav>
                  </div>

                  {/* Content */}
                  <div className="p-8 flex-1 overflow-auto">
                    {activeTab === "summary" && (
                      <div className="space-y-8">
                        {/* File info card */}
                        {file && (
                          <div className="bg-white rounded-xl shadow p-4 flex items-center space-x-4 border border-gray-100">
                            <div className="flex-shrink-0 text-red-500 text-4xl">
                              📄
                            </div>
                            <div className="flex-grow">
                              <h3 className="text-xl font-bold text-gray-800">
                                {file.name}
                              </h3>
                              <p className="text-sm text-gray-600">
                                {stats.pages} pages •{" "}
                                {formatBytes(file.size || 0)}
                              </p>
                              <div className="mt-2 text-sm font-semibold px-3 py-1 rounded-full inline-flex items-center space-x-2 bg-blue-50 text-blue-700">
                                <span>•</span>
                                <span>
                                  {progressPct < 100
                                    ? "Uploading/Processing..."
                                    : "Completed"}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                          <StatCard
                            label="PAGES"
                            value={stats.pages}
                            icon="📄"
                            tone="blue"
                          />
                          <StatCard
                            label="TEXT"
                            value={stats.textBlocks}
                            icon="🅰️"
                            tone="green"
                          />
                          <StatCard
                            label="TABLES"
                            value={stats.tables}
                            icon="📊"
                            tone="purple"
                          />
                          <StatCard
                            label="TIME"
                            value={stats.time}
                            icon="⏱️"
                            tone="yellow"
                          />
                        </div>

                        {/* Downloads */}
                        <div className="bg-white p-6 rounded-xl shadow border border-gray-100">
                          <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                            <span className="mr-3 text-blue-600">⬇️</span>
                            Download Results
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <button
                              className={`flex items-center justify-center space-x-3 ${theme.primaryBtn} font-semibold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-[1.02] shadow-sm hover:shadow-md`}
                            >
                              <span>🧩</span>
                              <span>JSON Format</span>
                            </button>
                            <button
                              className={`flex items-center justify-center space-x-3 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-[1.02] shadow-sm hover:shadow-md`}
                            >
                              <span>📄</span>
                              <span>Markdown</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeTab === "comparison" && (
                      <div className="space-y-6">
                        <div className="bg-white p-4 rounded-xl shadow mb-6 border border-gray-100">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <button className="px-4 py-2 bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 rounded-lg flex items-center space-x-2 font-medium">
                                ◀️ <span>Previous</span>
                              </button>
                              <span className="px-4 py-2 bg-blue-50 text-blue-800 rounded-lg font-medium">
                                Page 1 of {Math.max(1, stats.pages)}
                              </span>
                              <button className="px-4 py-2 bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 rounded-lg flex items-center space-x-2 font-medium">
                                <span>Next</span> ▶️
                              </button>
                            </div>
                            <div className="flex items-center space-x-3">
                              <label className="text-sm font-medium text-gray-700">
                                Zoom:
                              </label>
                              <select className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                                <option>50%</option>
                                <option>75%</option>
                                <option defaultValue>100%</option>
                                <option>125%</option>
                                <option>150%</option>
                              </select>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                          <div className="bg-white p-6 rounded-xl shadow border border-gray-100">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                              <span className="mr-3 text-red-500">📄</span>
                              Original PDF Page
                            </h3>
                            <div className="bg-gray-50 rounded-xl p-4 min-h-[300px] flex items-center justify-center text-gray-400">
                              (PDF preview here)
                            </div>
                          </div>

                          <div className="bg-white p-6 rounded-xl shadow border border-gray-100">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                              <span className="mr-3 text-green-600">📄</span>
                              Extracted Content
                            </h3>
                            <div className="bg-gray-50 rounded-xl p-4 min-h-[300px] text-gray-700">
                              (Extracted content preview)
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeTab === "json" && (
                      <div className="space-y-6">
                        <div className="bg-white p-4 rounded-xl shadow mb-6 border border-gray-100">
                          <div className="flex justify-between items-center">
                            <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                              <span className="mr-2 text-blue-600">🧩</span>{" "}
                              JSON Output
                            </h3>
                            <div className="flex space-x-2">
                              <button
                                className={`px-4 py-2 ${theme.primaryBtn} rounded-lg inline-flex items-center space-x-2 font-medium`}
                              >
                                Copy
                              </button>
                              <button className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium">
                                Expand All
                              </button>
                              <button className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium">
                                Collapse All
                              </button>
                            </div>
                          </div>
                        </div>
                        <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
                          <div
                            className="p-6 overflow-x-auto"
                            style={{ minHeight: 400, maxHeight: 600 }}
                          >
                            <div className="text-center py-12 text-gray-500">
                              <div className="text-4xl mb-4">🧩</div>
                              <p className="text-lg">
                                JSON data will appear here
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeTab === "markdown" && (
                      <div className="space-y-6">
                        <div className="bg-white p-4 rounded-xl shadow mb-6 border border-gray-100">
                          <div className="flex justify-between items-center">
                            <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                              <span className="mr-2 text-emerald-600">📄</span>{" "}
                              Markdown Source
                            </h3>
                            <button
                              className={`px-4 py-2 ${theme.primaryBtn} rounded-lg inline-flex items-center space-x-2 font-medium`}
                            >
                              Copy
                            </button>
                          </div>
                        </div>
                        <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
                          <div
                            className="p-6 overflow-x-auto"
                            style={{ maxHeight: 600 }}
                          >
                            <pre className="bg-gray-50 rounded-lg p-4 text-sm">{`# Markdown content will appear here...

- Lorem ipsum
- Dolor sit amet
`}</pre>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeTab === "preview" && (
                      <div className="space-y-6">
                        <div className="bg-white p-4 rounded-xl shadow mb-6 border border-gray-100">
                          <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                            <span className="mr-2 text-purple-600">👁️</span>
                            Rendered Preview
                          </h3>
                          <p className="text-sm text-gray-600 mt-1">
                            How your extracted content will look when rendered
                          </p>
                        </div>
                        <div
                          className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden"
                          style={{ maxHeight: 600, overflowY: "auto" }}
                        >
                          <div className="p-8 prose max-w-none">
                            <div className="text-center py-12 text-gray-500">
                              <div className="text-4xl mb-4">👁️</div>
                              <p className="text-lg">
                                Preview will appear here
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                // Help Panel (visible BEFORE Start Extraction is pressed)
                <div
                  className={`${theme.glass} rounded-xl shadow-sm overflow-hidden h-full min-h-[720px] flex flex-col`}
                >
                  <div className="px-6 py-4 text-gray-800 bg-gradient-to-r from-indigo-50/80 to-purple-50/80 border-b border-gray-100/60">
                    <h2 className="text-2xl font-bold flex items-center">
                      <span className="mr-3">❓</span>
                      How to Use PDF Extraction Pro
                    </h2>
                    <p className="text-gray-600 mt-1">
                      Follow these simple steps to extract content from your
                      PDFs
                    </p>
                  </div>

                  <div className="p-8 flex-1 overflow-auto">
                    <HelpStep n={1} tone="blue" title="Upload Your File">
                      Drag &amp; drop your file into the upload zone, or click
                      to browse.
                    </HelpStep>
                    <HelpStep
                      n={2}
                      tone="green"
                      title="Configure Extraction Settings"
                    >
                      Choose what to extract (text, tables, images) and
                      optionally set page ranges.
                    </HelpStep>
                    <HelpStep n={3} tone="purple" title="Review & Compare">
                      Validate accuracy by comparing original pages and
                      extracted content.
                    </HelpStep>
                    <HelpStep n={4} tone="yellow" title="Download Results">
                      Export JSON or Markdown for use in your apps or docs.
                    </HelpStep>

                    <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-200/60">
                      <div className="flex items-start space-x-4">
                        <div className="flex-shrink-0 p-3 bg-white rounded-xl shadow">
                          <span className="text-yellow-500 text-2xl">💡</span>
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-800 mb-2">
                            Pro Tips
                          </h3>
                          <ul className="space-y-2 text-gray-700 list-disc pl-4">
                            <li>
                              Use high-quality PDFs with clear text and
                              well-structured tables.
                            </li>
                            <li>
                              Limit to specific page ranges to speed up
                              processing.
                            </li>
                            <li>
                              Use Preview to see how content renders in HTML.
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="px-6 py-4 bg-white/60 text-center text-sm text-gray-500 border-t border-white/40">
                    © {new Date().getFullYear()} Vidavox Doc AI. All rights
                    reserved.
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </SidebarLayout>
  );
}

/* ---------- Small pieces ---------- */
function ToggleRow({ label, checked, onChange, icon }) {
  return (
    <div className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm border border-gray-100">
      <div className="flex items-center space-x-3">
        <span className="text-xl">{icon}</span>
        <span className="font-medium">{label}</span>
      </div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          className="sr-only peer"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <div className="w-11 h-6 bg-gray-200 rounded-full peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
      </label>
    </div>
  );
}

function StatCard({ label, value, icon, tone }) {
  const toneMap = {
    blue: "bg-blue-100 text-blue-600",
    green: "bg-emerald-100 text-emerald-600",
    purple: "bg-purple-100 text-purple-600",
    yellow: "bg-yellow-100 text-yellow-600",
  };
  return (
    <div className="bg-white p-6 rounded-xl shadow border border-gray-100">
      <div className="flex items-center justify-between mb-3">
        <div className={`p-3 rounded-xl ${toneMap[tone] || "bg-gray-100"}`}>
          <span className="text-xl">{icon}</span>
        </div>
        <span className="text-xs text-gray-500 font-medium">{label}</span>
      </div>
      <div className="text-3xl font-bold text-gray-800">{value}</div>
      <p className="text-sm text-gray-500 mt-1">
        {label === "TIME"
          ? "Processing"
          : label === "TABLES"
          ? "Found"
          : "Extracted"}
      </p>
    </div>
  );
}

function HelpStep({ n, tone, title, children }) {
  const toneMap = {
    blue: "from-blue-600 to-indigo-600",
    green: "from-emerald-600 to-teal-600",
    purple: "from-purple-600 to-pink-600",
    yellow: "from-yellow-600 to-orange-600",
  };
  const bgMap = {
    blue: "bg-blue-50 border-blue-100",
    green: "bg-emerald-50 border-emerald-100",
    purple: "bg-purple-50 border-purple-100",
    yellow: "bg-yellow-50 border-yellow-100",
  };
  return (
    <div
      className={`flex items-start space-x-4 p-4 rounded-xl border ${bgMap[tone]}`}
    >
      <div
        className={`flex-shrink-0 w-12 h-12 rounded-full text-white flex items-center justify-center font-bold text-lg bg-gradient-to-r ${toneMap[tone]}`}
      >
        {n}
      </div>
      <div>
        <h3 className="font-semibold text-gray-800 text-lg">{title}</h3>
        <p className="text-gray-600 mt-1">{children}</p>
      </div>
    </div>
  );
}

/* ---------- utils ---------- */
function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}
function formatBytes(bytes) {
  if (!bytes) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
