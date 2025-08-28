// src/pages/UniDocParserPage.jsx
import React, {
  useEffect,
  useMemo,
  useState,
  useContext,
  useRef,
  useCallback,
} from "react";
import SidebarLayout from "../components/SidebarLayout";
import ExtractedPageViewer from "../components/ExtractedPageViewer";

import { flattenAllNodes } from "../utils/tree";
import { fetchFolderTree, extractDocument } from "../services/api";
import { useLocation } from "react-router-dom";
import { AuthContext } from "../contexts/AuthContext";

import {
  STORAGE,
  saveJSON,
  loadJSON,
  saveSessionJSON,
  loadSessionJSON,
  fileToDataURL,
  dataURLToFile,
  clearExtractionPersist,
} from "../utils/persist";
import { renderMarkdownAdv } from "../utils/renderMarkdownAdv";

import JsonEditorViewer from "../components/JsonEditorViewer";

/** === Theme to match DashboardPage === */
const theme = {
  pageBg:
    "bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 min-h-screen p-6 space-y-6",
  glass: "bg-white/60 backdrop-blur-sm border border-white/40",
  sectionHeader: "bg-gradient-to-r from-slate-50/80 to-gray-50/80",
  primaryBtn:
    "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white",
  softBar: "bg-gray-50/40 border-b border-gray-100/60",
};

const MAX_FILE_SIZE_MB = 200; // hard limit for uploads; session snapshot still 20MB

export default function UniDocParserPage() {
  const { user } = useContext(AuthContext); // currently unused, but good to keep
  const loc = useLocation();
  const isMounted = useRef(true);
  const activeTimer = useRef(null);
  const selectionIdRef = useRef(null);
  const resumeTimerRef = useRef(null);
  // --- Folder tree & destination ---
  const [tree, setTree] = useState([]);
  const [loadingTree, setLoadingTree] = useState(true);

  const defaultFolderFromNav = (loc.state && loc.state.defaultFolderId) || null;
  const folderList = useMemo(() => {
    const all = flattenAllNodes(tree || []);
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

  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem(STORAGE.ACTIVE_TAB) || "summary";
  });
  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
    localStorage.setItem(STORAGE.ACTIVE_TAB, tab);
  }, []);

  const [currentStep, setCurrentStep] = useState(1);
  const [progressVisible, setProgressVisible] = useState(false);
  const [progressPct, setProgressPct] = useState(0);
  const [statusLabel, setStatusLabel] = useState("Uploading...");
  const [statusSub, setStatusSub] = useState("This may take a few moments");
  const [stats, setStats] = useState({
    pages: 0,
    textBlocks: 0,
    tables: 0,
    time: "—",
  });

  const [result, setResult] = useState(null); // full server response
  const [jsonText, setJsonText] = useState(""); // pretty JSON string
  const [mdText, setMdText] = useState(""); // combined markdown
  const [errorMsg, setErrorMsg] = useState("");

  // JSON preview controls
  const [expandAllJson, setExpandAllJson] = useState(false);
  const [collapseAllJson, setCollapseAllJson] = useState(false);

  // show results viewer only after Start Extraction
  const [showViewer, setShowViewer] = useState(false);

  const isCompleted = !!result?.extraction_result && !progressVisible;

  // Add/ensure this once near top-level of the component:
  useEffect(() => {
    isMounted.current = true; // <-- important for StrictMode
    return () => {
      isMounted.current = false;
      if (activeTimer.current) {
        clearInterval(activeTimer.current);
        activeTimer.current = null;
      }
    };
  }, []);

  // stats recompute when result changes
  useEffect(() => {
    const ex = result?.extraction_result;
    if (!ex?.pages) return;
    const pages = Array.isArray(ex.pages) ? ex.pages : [];
    setStats({
      pages: pages.length,
      textBlocks: pages.reduce((acc, p) => {
        const els = p?.elements || [];
        return acc + els.filter((e) => e?.type === "text").length;
      }, 0),
      tables: pages.reduce((acc, p) => {
        const els = p?.elements || [];
        return (
          acc +
          els.filter(
            (e) =>
              e?.type === "image" && e?.image_metadata?.image_type === "table"
          ).length
        );
      }, 0),
      time: Number.isFinite(ex?.processing_time)
        ? `${Math.round(ex.processing_time)}s`
        : "—",
    });
  }, [result]);

  // Put this helper above the component or in a util
  function normalizeTreeData(data) {
    if (Array.isArray(data)) return data; // already an array of roots
    if (Array.isArray(data?.items)) return data.items; // { items: [...] }
    if (Array.isArray(data?.folders)) return data.folders; // { folders: [...] }
    if (data && typeof data === "object") return [data]; // single root object
    return []; // fallback
  }

  // Replace your load effect with this:
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoadingTree(true);
        const data = await fetchFolderTree(); // keep your working call
        if (cancelled) return;

        const normalized = normalizeTreeData(data);
        setTree(normalized);

        // (optional) quick sanity log while you tune the normalizer
        // console.log("folders:", normalized.map(n => n.name ?? n.id));
      } catch (e) {
        if (!cancelled) {
          console.error("Failed to load folder tree:", e);
          // You might also surface an error message to the user here.
        }
      } finally {
        if (!cancelled) setLoadingTree(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    (async () => {
      const savedFile = loadJSON(STORAGE.SELECTED_FILE);
      const job = loadJSON(STORAGE.EXTRACTION_JOB);

      if (savedFile?.name) {
        setShowViewer(savedFile?.showViewer ?? false);
        // placeholder File to show name even if large file
        setFile(new File([], savedFile.name, { type: savedFile.type || "" }));
        setCurrentStep(savedFile?.currentStep || 2);
      }

      // 🔹 0) Finalize immediately if a result already exists
      const persisted = loadJSON(STORAGE.EXTRACTION_RESULT);
      if (persisted?.extraction_result) {
        setShowViewer(true);
        setResult(persisted);

        let lsJson = localStorage.getItem(STORAGE.JSON_TEXT);
        let lsMd = localStorage.getItem(STORAGE.MARKDOWN_TEXT);
        if (!lsJson || !lsMd) {
          const ex = persisted.extraction_result;
          lsJson = lsJson || buildJsonStringFromResult(ex);
          lsMd = lsMd || buildMarkdownFromPages(ex?.pages);
          if (lsJson) localStorage.setItem(STORAGE.JSON_TEXT, lsJson);
          if (lsMd) localStorage.setItem(STORAGE.MARKDOWN_TEXT, lsMd);
        }
        setJsonText(lsJson || "");
        setMdText(lsMd || "");

        saveJSON(STORAGE.EXTRACTION_JOB, {
          status: "completed",
          finishedAt: Date.now(),
          filename: persisted?.filename || "",
        });

        if (activeTimer.current) {
          clearInterval(activeTimer.current);
          activeTimer.current = null;
        }
        setProgressPct(100);
        setStatusLabel("Completed");
        setStatusSub("Your file has been processed");
        setProgressVisible(false);
        setCurrentStep(4);
        setActiveTab("summary");
        localStorage.setItem(STORAGE.ACTIVE_TAB, "summary");
        return; // ✅ don’t start resume polling
      }

      // 🔹 1) Only then, if there’s a running job, resume polling
      if (job?.status === "running") {
        setShowViewer(true);
        setProgressVisible(true);
        setStatusLabel("Processing...");
        setStatusSub("Resuming your extraction");
        setProgressPct((p) => Math.max(p, 90));
        if (activeTimer.current) {
          clearInterval(activeTimer.current);
          activeTimer.current = null;
        }

        if (resumeTimerRef.current) {
          clearInterval(resumeTimerRef.current);
          resumeTimerRef.current = null;
        }
        resumeTimerRef.current = setInterval(() => {
          try {
            const data = loadJSON(STORAGE.EXTRACTION_RESULT);
            if (data?.extraction_result) {
              clearInterval(resumeTimerRef.current);
              resumeTimerRef.current = null;
              if (!isMounted.current) return;

              setResult(data);

              let lsJson = localStorage.getItem(STORAGE.JSON_TEXT);
              let lsMd = localStorage.getItem(STORAGE.MARKDOWN_TEXT);
              if (!lsJson || !lsMd) {
                const ex = data.extraction_result;
                lsJson = lsJson || buildJsonStringFromResult(ex);
                lsMd = lsMd || buildMarkdownFromPages(ex?.pages);
                if (lsJson) localStorage.setItem(STORAGE.JSON_TEXT, lsJson);
                if (lsMd) localStorage.setItem(STORAGE.MARKDOWN_TEXT, lsMd);
              }
              setJsonText(lsJson || "");
              setMdText(lsMd || "");

              saveJSON(STORAGE.EXTRACTION_JOB, {
                status: "completed",
                finishedAt: Date.now(),
                filename: data?.filename || "",
              });

              setProgressPct(100);
              setStatusLabel("Completed");
              setStatusSub("Your file has been processed");
              setProgressVisible(false);
              setCurrentStep(4);
              setActiveTab("summary");
              localStorage.setItem(STORAGE.ACTIVE_TAB, "summary");
            }
          } catch (e) {
            console.error("Resume interval failed:", e);
            if (resumeTimerRef.current) {
              clearInterval(resumeTimerRef.current);
              resumeTimerRef.current = null;
            }
            if (isMounted.current) {
              setProgressVisible(false);
              setStatusLabel("Failed");
              setStatusSub("Could not resume result");
            }
          }
        }, 200);
      }
    })();

    return () => {
      if (resumeTimerRef.current) {
        clearInterval(resumeTimerRef.current);
        resumeTimerRef.current = null;
      }
    };
  }, []);

  // set default destination
  useEffect(() => {
    if (!destinationId && folderList.length > 0) {
      setDestinationId(defaultFolderFromNav || folderList[0]?.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folderList.length]);

  // --- Drag & Drop handlers ---
  const onDragOver = useCallback((e) => {
    e.preventDefault();
    setDragActive(true);
  }, []);
  const onDragLeave = useCallback((e) => {
    e.preventDefault();
    setDragActive(false);
  }, []);
  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragActive(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  }, []);

  function EmptyState({ icon = "ℹ️", text = "Nothing to show" }) {
    return (
      <div className="flex flex-col items-center justify-center text-gray-400 py-12">
        <div className="text-4xl mb-2">{icon}</div>
        <div className="text-sm">{text}</div>
      </div>
    );
  }

  const handleFile = useCallback((f) => {
    // basic validation
    const mb = f.size / (1024 * 1024);
    if (mb > MAX_FILE_SIZE_MB) {
      setErrorMsg(
        `File is too large (${mb.toFixed(
          1
        )} MB). Max allowed is ${MAX_FILE_SIZE_MB} MB.`
      );
      return;
    }

    const allowed = /\.pdf$|\.png$|\.jpe?g$|\.xls$|\.xlsx$/i.test(f.name || "");
    if (!allowed) {
      setErrorMsg(
        "Unsupported file type. Allowed: PDF, PNG, JPG/JPEG, XLS, XLSX."
      );
      return;
    }

    setErrorMsg("");
    setFile(f);
    setCurrentStep(2); // move to Configure

    // 1) new selection namespace + clear any old outcome immediately
    const selectionId =
      crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
    selectionIdRef.current = selectionId;
    clearPreviousOutcome();

    // 2) write a synchronous minimal snapshot *right now*
    const baseSnap = {
      name: f.name,
      size: f.size,
      type: f.type,
      selectedAt: Date.now(),
      selectionId,
      currentStep: 2,
      showViewer: false,
    };
    saveJSON(STORAGE.SELECTED_FILE, baseSnap);
    // Persist file to sessionStorage as dataURL (guard 20MB)
    if (f.size <= 20 * 1024 * 1024) {
      fileToDataURL(f)
        .then((dataURL) => {
          const stillCurrent = selectionIdRef.current === selectionId;
          if (!stillCurrent) return; // user picked another file since
          saveJSON(STORAGE.SELECTED_FILE, {
            name: f.name,
            size: f.size,
            type: f.type,
            dataURL,
            currentStep: 2,
            showViewer: false,
          });
        })
        .catch((e) => console.warn("Failed to serialize file:", e));
    } else {
      // too large for sessionStorage -> store metadata only
      saveJSON(STORAGE.SELECTED_FILE, {
        name: f.name,
        size: f.size,
        type: f.type,
        currentStep: 2,
        showViewer: false,
      });
    }
  }, []);

  const onBrowseClick = useCallback(() => fileInputRef.current?.click(), []);

  function parsePageRange(rangeStr) {
    if (!rangeStr?.trim()) return [];
    const parts = rangeStr
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const nums = [];
    for (const p of parts) {
      if (/^\d+$/.test(p)) nums.push(Number(p));
      else if (/^\d+\s*-\s*\d+$/.test(p)) {
        const [a, b] = p.split("-").map((s) => Number(s.trim()));
        const start = Math.min(a, b),
          end = Math.max(a, b);
        for (let i = start; i <= end; i++) nums.push(i);
      }
    }
    return Array.from(new Set(nums)).sort((a, b) => a - b);
  }

  const startExtraction = useCallback(async () => {
    if (!file || !destinationId) return;

    // UI: starting state
    setShowViewer(true);
    setCurrentStep(3);
    setProgressVisible(true);
    setProgressPct(0);
    setStatusLabel("Uploading...");
    setStatusSub("This may take a few moments");
    setErrorMsg("");
    setResult(null);
    setJsonText("");
    setMdText("");
    setStats({ pages: 0, textBlocks: 0, tables: 0, time: "—" });

    clearPreviousOutcome(); // <— wipe previous run completely
    setActiveTab("summary");

    // Mark job "running" so a future mount can detect it
    saveJSON(STORAGE.EXTRACTION_JOB, {
      status: "running",
      startedAt: Date.now(),
      filename: file.name,
      selectionId: selectionIdRef.current,
    });

    // Snapshot file to session
    const existingFile = loadJSON(STORAGE.SELECTED_FILE) || {};
    saveJSON(STORAGE.SELECTED_FILE, {
      ...existingFile,
      currentStep: 3,
      showViewer: true,
    });

    // optimistic progress (visual only)
    if (activeTimer.current) clearInterval(activeTimer.current);
    activeTimer.current = setInterval(() => {
      setProgressPct((p) => (p < 90 ? p + 1 : p));
    }, 120);

    // If you want the request to continue even after leaving the page,
    // DON'T abort on unmount. (You can still pass a signal; just don't call abort.)
    const controller = new AbortController();

    try {
      const options = {
        extract_text: !!extractText,
        extract_tables: !!extractTables,
        extract_images: !!extractImages,
        page_numbers: parsePageRange(pageRange),
        destination_id: destinationId,
      };

      // Make the client robust to axios/fetch variations
      const raw = await extractDocument({
        file,
        options,
        signal: controller.signal,
      });
      const data = raw?.extraction_result
        ? raw
        : raw?.data?.extraction_result
        ? raw.data
        : raw?.data ?? raw;

      // ---------- PERSIST FIRST (even if unmounted) ----------
      saveJSON(STORAGE.EXTRACTION_RESULT, data);

      if (data?.extraction_result) {
        try {
          // JSON
          const json = JSON.stringify(data.extraction_result, null, 2);
          localStorage.setItem(STORAGE.JSON_TEXT, json);

          // Markdown
          const pages = Array.isArray(data.extraction_result.pages)
            ? data.extraction_result.pages
            : [];
          let combinedMarkdown = "";
          for (let i = 0; i < pages.length; i++) {
            const page = pages[i];
            const pageMd = page?.markdown;
            const pageText = page?.text;
            if (pageMd || pageText) {
              if (combinedMarkdown) combinedMarkdown += "\n\n---\n\n";
              combinedMarkdown +=
                `# Page ${i + 1}\n\n` + (pageMd || pageText || "");
            }
          }
          if (combinedMarkdown.trim()) {
            localStorage.setItem(STORAGE.MARKDOWN_TEXT, combinedMarkdown);
          } else {
            localStorage.removeItem(STORAGE.MARKDOWN_TEXT);
          }
        } catch (e) {
          console.warn("Persist failed:", e);
        }
      }

      // Mark job done in storage
      saveJSON(STORAGE.EXTRACTION_JOB, {
        status: "completed",
        finishedAt: Date.now(),
        filename: file.name,
      });

      // ---------- NOW GUARD UI UPDATES ----------
      if (!isMounted.current) return;

      setStatusLabel("Processing...");
      setProgressPct(95);

      setResult(data);

      // Hydrate state from what we just persisted (so UI = storage)
      setJsonText(localStorage.getItem(STORAGE.JSON_TEXT) || "");
      setMdText(localStorage.getItem(STORAGE.MARKDOWN_TEXT) || "");

      setProgressPct(100);
      setStatusLabel("Completed");
      setStatusSub("Your file has been processed");
      setCurrentStep(4);
      setActiveTab("summary");
      setProgressVisible(false);
      localStorage.setItem(STORAGE.ACTIVE_TAB, "summary");

      const finFile = loadJSON(STORAGE.SELECTED_FILE) || {};
      saveJSON(STORAGE.SELECTED_FILE, {
        ...finFile,
        currentStep: 4,
        showViewer: true,
      });
    } catch (err) {
      // Persist failed status for future mounts
      saveJSON(STORAGE.EXTRACTION_JOB, {
        status: "failed",
        error: err?.message || String(err),
        failedAt: Date.now(),
        filename: file?.name,
      });

      if (!isMounted.current) return;

      console.error(err);
      setProgressPct(100);
      setStatusLabel("Failed");
      setStatusSub("");
      setErrorMsg(err?.message || "Extraction failed");
    } finally {
      if (activeTimer.current) {
        clearInterval(activeTimer.current);
        activeTimer.current = null;
      }
      // Hide spinner if we're still mounted (don’t touch UI if not)
      if (isMounted.current) setProgressVisible(false);
    }
  }, [
    file,
    destinationId,
    extractText,
    extractTables,
    extractImages,
    pageRange,
    setActiveTab,
  ]);

  // Clipboard helpers
  const copyToClipboard = useCallback(async (text, okMsg = "Copied!") => {
    try {
      await navigator.clipboard.writeText(text || "");
      // You can swap this alert for a toast/snackbar in your design system
      // eslint-disable-next-line no-alert
      alert(okMsg);
    } catch (e) {
      console.error("Clipboard copy failed", e);
      // eslint-disable-next-line no-alert
      alert("Copy failed.");
    }
  }, []);

  return (
    <SidebarLayout>
      {/* Page background to match Dashboard */}
      <div className={`min-h-screen ${theme.pageBg}`}>
        <div className="flex items-center justify-between">
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
        </div>

        {/* Main */}
        <main className="flex items-center justify-between">
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
                            PDF/Images/Excel up to {MAX_FILE_SIZE_MB}MB
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

                      <button
                        onClick={() => {
                          clearExtractionPersist();
                          setFile(null);
                          setResult(null);
                          setMdText("");
                          setJsonText("");
                          setShowViewer(false);
                          setCurrentStep(1);
                          setErrorMsg("");
                          if (activeTimer.current) {
                            clearInterval(activeTimer.current);
                            activeTimer.current = null;
                          }
                          localStorage.removeItem(STORAGE.SELECTED_FILE);
                          localStorage.removeItem(STORAGE.EXTRACTION_JOB);
                        }}
                        className="mt-3 w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded-lg"
                      >
                        Reset / New File
                      </button>

                      {errorMsg && (
                        <div className="mt-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700">
                          {errorMsg}
                        </div>
                      )}
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

            {/* Right: Results / Tabs OR Help */}
            <div className="xl:col-span-3">
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
                          onClick={() => handleTabChange(t.id)}
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
                                {stats.pages} pages • {formatBytes(file.size)}
                              </p>
                              <div className="mt-2 text-sm font-semibold px-3 py-1 rounded-full inline-flex items-center space-x-2 bg-blue-50 text-blue-700">
                                <span>
                                  {isCompleted
                                    ? "Completed"
                                    : "Uploading/Processing..."}
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
                              onClick={() => {
                                const blob = new Blob([jsonText || ""], {
                                  type: "application/json;charset=utf-8",
                                });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement("a");
                                a.href = url;
                                a.download = (file?.name || "result") + ".json";
                                a.click();
                                URL.revokeObjectURL(url);
                              }}
                              className={`flex items-center justify-center space-x-3 ${theme.primaryBtn} font-semibold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-[1.02] shadow-sm hover:shadow-md`}
                            >
                              <span>🧩</span>
                              <span>JSON Format</span>
                            </button>
                            <button
                              onClick={() => {
                                const blob = new Blob([mdText || ""], {
                                  type: "text/markdown;charset=utf-8",
                                });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement("a");
                                a.href = url;
                                a.download = (file?.name || "result") + ".md";
                                a.click();
                                URL.revokeObjectURL(url);
                              }}
                              className="flex items-center justify-center space-x-3 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-[1.02] shadow-sm hover:shadow-md"
                            >
                              <span>📄</span>
                              <span>Markdown</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeTab === "comparison" &&
                      (result?.extraction_result?.pages ? (
                        <ExtractedPageViewer
                          pages={result.extraction_result.pages}
                          showImages={extractImages}
                          previewHeight={1024}
                        />
                      ) : (
                        <div className="text-gray-500">No pages available</div>
                      ))}

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
                                onClick={() =>
                                  copyToClipboard(jsonText, "JSON copied!")
                                }
                                className={`px-4 py-2 ${theme.primaryBtn} rounded-lg inline-flex items-center space-x-2 font-medium`}
                              >
                                Copy
                              </button>
                              <button
                                onClick={() => {
                                  setCollapseAllJson(false);
                                  setExpandAllJson(true);
                                  // small pulse to trigger effect in viewer
                                  setTimeout(() => setExpandAllJson(false), 0);
                                }}
                                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium"
                              >
                                Expand All
                              </button>
                              <button
                                onClick={() => {
                                  setExpandAllJson(false);
                                  setCollapseAllJson(true);
                                  setTimeout(
                                    () => setCollapseAllJson(false),
                                    0
                                  );
                                }}
                                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium"
                              >
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
                            {(() => {
                              try {
                                // const parsedJson = jsonText
                                //   ? JSON.parse(jsonText)
                                //   : null;
                                const parsedJson = (() => {
                                  if (jsonText) {
                                    try {
                                      return JSON.parse(jsonText);
                                    } catch {}
                                  }
                                  // Fallback: derive directly from result
                                  const ex = result?.extraction_result;
                                  try {
                                    return ex
                                      ? JSON.parse(
                                          buildJsonStringFromResult(ex)
                                        )
                                      : null;
                                  } catch {}
                                  return null;
                                })();
                                return parsedJson ? (
                                  <JsonEditorViewer
                                    json={parsedJson}
                                    expandAll={expandAllJson}
                                    collapseAll={collapseAllJson}
                                  />
                                ) : (
                                  <EmptyState
                                    icon="🧩"
                                    text="No JSON data yet"
                                  />
                                );
                              } catch (err) {
                                return (
                                  <EmptyState
                                    icon="🧩"
                                    text="Failed to load or parse JSON data"
                                  />
                                );
                              }
                            })()}
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
                              onClick={() =>
                                copyToClipboard(mdText, "Markdown copied!")
                              }
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
                            <pre className="bg-gray-50 rounded-lg p-4 text-sm whitespace-pre-wrap">
                              {mdText ||
                                buildMarkdownFromPages(
                                  result?.extraction_result?.pages
                                ) ||
                                `# Markdown content will appear here...`}
                            </pre>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeTab === "preview" &&
                      (() => {
                        const previewMd =
                          mdText ||
                          buildMarkdownFromPages(
                            result?.extraction_result?.pages
                          ) ||
                          "";

                        return (
                          <div className="space-y-6">
                            <div className="bg-white p-4 rounded-xl shadow mb-6 border border-gray-100">
                              <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                                <span className="mr-2 text-purple-600">👁️</span>
                                Rendered Preview
                              </h3>
                              <p className="text-sm text-gray-600 mt-1">
                                How your extracted content will look when
                                rendered
                              </p>
                            </div>

                            <div
                              className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden"
                              style={{ maxHeight: 600, overflowY: "auto" }}
                            >
                              {previewMd ? (
                                <div
                                  className="p-8 prose max-w-none"
                                  dangerouslySetInnerHTML={{
                                    __html: renderMarkdownAdv(previewMd),
                                  }}
                                />
                              ) : (
                                <div className="text-center py-12 text-gray-500">
                                  <div className="text-4xl mb-4">👁️</div>
                                  <p className="text-lg">
                                    Preview will appear here
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                  </div>
                </div>
              ) : (
                // Help Panel
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
function formatBytes(bytes) {
  if (!bytes) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.min(
    Math.floor(Math.log(bytes) / Math.log(k)),
    sizes.length - 1
  );
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function buildJsonStringFromResult(extraction_result) {
  try {
    return JSON.stringify(extraction_result ?? {}, null, 2);
  } catch {
    return "";
  }
}

function buildMarkdownFromPages(pages) {
  const arr = Array.isArray(pages) ? pages : [];
  let out = "";
  for (let i = 0; i < arr.length; i++) {
    const page = arr[i];
    const pageMd = page?.markdown;
    const pageText = page?.text;
    if (pageMd || pageText) {
      if (out) out += "\n\n---\n\n";
      out += `# Page ${i + 1}\n\n` + (pageMd || pageText || "");
    }
  }
  return out.trim();
}
function clearPreviousOutcome() {
  localStorage.removeItem(STORAGE.EXTRACTION_RESULT);
  localStorage.removeItem(STORAGE.JSON_TEXT);
  localStorage.removeItem(STORAGE.MARKDOWN_TEXT);
  localStorage.removeItem(STORAGE.EXTRACTION_JOB);
}
