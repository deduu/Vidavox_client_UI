// src/hooks/useExtractionSession.js
import { useState, useEffect, useRef, useCallback } from "react";
import { extractDocument } from "../services/api";
import {
  STORAGE,
  saveJSON,
  loadJSON,
  clearExtractionPersist,
  fileToDataURL,
} from "../utils/persist";
import {
  buildJsonStringFromResult,
  buildMarkdownFromPages,
} from "../utils/extraction";

const POLLING_INTERVAL = 2000; // Check every 2 seconds instead of 200ms
const PROGRESS_INCREMENT = 500; // Slower progress animation (500ms)
const SESSION_STORAGE_LIMIT = 20 * 1024 * 1024; // 20MB
const MAX_PROGRESS_WITHOUT_COMPLETION = 85; // Don't go above 85% until completed

export function useExtractionSession(destinationId) {
  // File and options state
  const [file, setFile] = useState(null);
  const [extractionOptions, setExtractionOptions] = useState({
    extractText: true,
    extractTables: true,
    extractImages: false,
    pageRange: "",
  });
  const userSelectedNewFileRef = useRef(false);

  // Extraction state
  const [result, setResult] = useState(null);
  const [progress, setProgress] = useState({
    visible: false,
    pct: 0,
    label: "Uploading...",
    subLabel: "This may take a few moments",
  });
  const [error, setError] = useState("");
  const [showViewer, setShowViewer] = useState(false);

  // Refs for cleanup and race condition prevention
  const isMountedRef = useRef(true);
  const progressTimerRef = useRef(null);
  const resumeTimerRef = useRef(null);
  const selectionIdRef = useRef(null);
  const abortControllerRef = useRef(null);
  const currentJobIdRef = useRef(null);

  // Computed state
  const isCompleted = !!(result?.extraction_result && !progress.visible);

  // Cleanup function - moved before other useCallback hooks
  const cleanup = useCallback(() => {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
    if (resumeTimerRef.current) {
      clearInterval(resumeTimerRef.current);
      resumeTimerRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  // Setup and cleanup
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      cleanup();
    };
  }, [cleanup]);

  // Session persistence helpers
  const persistProgress = useCallback((progressState) => {
    try {
      saveJSON(STORAGE.EXTRACTION_PROGRESS, {
        ...progressState,
        lastUpdated: Date.now(),
      });
    } catch (err) {
      console.warn("Failed to persist progress:", err);
    }
  }, []);

  // Progress timer management
  const startProgressTimer = useCallback(() => {
    if (progressTimerRef.current) return;

    progressTimerRef.current = setInterval(() => {
      if (!isMountedRef.current) return;
      setProgress((prev) => {
        const newProgress = {
          ...prev,
          pct:
            prev.pct < MAX_PROGRESS_WITHOUT_COMPLETION
              ? Math.min(
                  prev.pct + Math.random() * 3 + 1,
                  MAX_PROGRESS_WITHOUT_COMPLETION
                )
              : prev.pct,
        };

        // Persist progress updates
        persistProgress(newProgress);
        return newProgress;
      });
    }, PROGRESS_INCREMENT);
  }, [persistProgress]);

  const stopProgressTimer = useCallback(() => {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  }, []);

  const persistExtractionResult = useCallback((data) => {
    try {
      // Save main result
      saveJSON(STORAGE.EXTRACTION_RESULT, data);

      // Save processed formats
      if (data?.extraction_result) {
        const jsonString = buildJsonStringFromResult(data.extraction_result);
        const markdownString = buildMarkdownFromPages(
          data.extraction_result.pages
        );

        localStorage.setItem(STORAGE.JSON_TEXT, jsonString);
        localStorage.setItem(STORAGE.MARKDOWN_TEXT, markdownString);
      }

      // Mark job complete
      saveJSON(STORAGE.EXTRACTION_JOB, {
        status: "completed",
        finishedAt: Date.now(),
        filename: data?.filename || "",
        jobId: currentJobIdRef.current,
      });
    } catch (err) {
      console.warn("Failed to persist extraction result:", err);
    }
  }, []);

  // Enhanced polling for job status
  const startJobPolling = useCallback(
    (jobId) => {
      if (resumeTimerRef.current) {
        clearInterval(resumeTimerRef.current);
        resumeTimerRef.current = null;
      }

      console.log(`Starting job polling for: ${jobId}`);

      resumeTimerRef.current = setInterval(() => {
        if (!isMountedRef.current) {
          clearInterval(resumeTimerRef.current);
          resumeTimerRef.current = null;
          return;
        }

        try {
          const savedJob = loadJSON(STORAGE.EXTRACTION_JOB);
          const savedResult = loadJSON(STORAGE.EXTRACTION_RESULT);

          // Check if job is completed
          if (savedResult?.extraction_result && savedJob?.jobId === jobId) {
            console.log("Job completed, stopping polling");
            clearInterval(resumeTimerRef.current);
            resumeTimerRef.current = null;
            stopProgressTimer();

            setResult(savedResult);
            setProgress({
              visible: false,
              pct: 100,
              label: "Completed",
              subLabel: "Your file has been processed",
            });
            return;
          }

          // Update progress label to show we're still working
          setProgress((prev) => ({
            ...prev,
            label: "Processing...",
            subLabel: `Extracting content from ${file?.name || "your file"}`,
          }));
        } catch (err) {
          console.error("Job polling failed:", err);
          clearInterval(resumeTimerRef.current);
          resumeTimerRef.current = null;
          setError("Failed to check extraction status");
          setProgress((prev) => ({ ...prev, visible: false }));
        }
      }, POLLING_INTERVAL);
    },
    [file?.name, stopProgressTimer]
  );

  // Session recovery - FIXED VERSION
  useEffect(() => {
    if (userSelectedNewFileRef.current) return; // user is starting fresh; do not recover now

    const recoverSession = async () => {
      try {
        const savedFile = loadJSON(STORAGE.SELECTED_FILE);
        const job = loadJSON(STORAGE.EXTRACTION_JOB);
        const persistedResult = loadJSON(STORAGE.EXTRACTION_RESULT);

        console.log("Recovering session:", {
          savedFile: !!savedFile,
          job: job?.status,
          result: !!persistedResult,
          jobId: job?.jobId,
          fileName: savedFile?.name,
        });

        // If we have file metadata, create a placeholder file for UI purposes
        // Only restore a placeholder if we ALSO have a job or a persisted result
        const hasRecoverableWork = !!job || !!persistedResult;
        if (hasRecoverableWork && savedFile?.name) {
          console.log("Restoring file metadata:", savedFile.name);
          const placeholderFile = new File([], savedFile.name, {
            type: savedFile.type || "",
          });
          setFile(placeholderFile);
          selectionIdRef.current = savedFile.selectionId;
        }

        // If we have a completed result, restore it immediately
        if (persistedResult?.extraction_result && job?.status === "completed") {
          console.log("Restoring completed result");
          setResult(persistedResult);
          setShowViewer(true);
          setProgress({
            visible: false,
            pct: 100,
            label: "Completed",
            subLabel: "Your file has been processed",
          });
          return;
        }

        // FIXED: If we have a running job, properly restore progress state
        if (job?.status === "running" && job?.jobId) {
          console.log("Resuming running job:", job.jobId);
          currentJobIdRef.current = job.jobId;
          setShowViewer(true);

          // Load persisted progress and calculate time-based advancement
          const savedProgress = loadJSON(STORAGE.EXTRACTION_PROGRESS);
          const elapsed = Date.now() - (job.startedAt || Date.now());

          let resumeProgress;

          if (savedProgress?.pct && savedProgress.lastUpdated) {
            // Calculate how much time passed since last update
            const timeSinceLastUpdate = Date.now() - savedProgress.lastUpdated;

            // Estimate progress advancement during absence (roughly 1% per 3 seconds)
            const progressAdvancement = Math.floor(timeSinceLastUpdate / 3000);

            // Add the advancement to last known progress, but cap at MAX_PROGRESS_WITHOUT_COMPLETION
            resumeProgress = Math.min(
              savedProgress.pct + progressAdvancement,
              MAX_PROGRESS_WITHOUT_COMPLETION
            );

            console.log(
              `Progress advancement: ${
                savedProgress.pct
              }% -> ${resumeProgress}% (+${progressAdvancement}% during ${Math.floor(
                timeSinceLastUpdate / 1000
              )}s absence)`
            );
          } else {
            // Fallback to time-based calculation from job start
            resumeProgress = Math.min(
              20 + Math.floor(elapsed / 10000),
              MAX_PROGRESS_WITHOUT_COMPLETION
            );
            console.log("Using time-based progress:", resumeProgress);
          }

          // FIXED: Ensure progress is visible and properly set
          setProgress({
            visible: true,
            pct: resumeProgress,
            label: "Processing...",
            subLabel: savedFile?.name
              ? `Extracting content from ${savedFile.name}`
              : "Resuming your extraction",
          });

          // Persist the updated progress immediately
          persistProgress({
            visible: true,
            pct: resumeProgress,
            label: "Processing...",
            subLabel: savedFile?.name
              ? `Extracting content from ${savedFile.name}`
              : "Resuming your extraction",
          });

          // FIXED: Start both timers properly
          startProgressTimer();
          startJobPolling(job.jobId);

          return; // Important: return here to prevent other state changes
        }

        // If we have a failed job, show the error state
        if (job?.status === "failed") {
          console.log("Restoring failed job state");
          setShowViewer(true);
          setError(job.error || "Extraction failed");
          setProgress({
            visible: false,
            pct: 0,
            label: "Failed",
            subLabel: "",
          });
          return;
        }

        // FIXED: If we have file metadata but no job, show initial ready state
        if (savedFile?.name && !job) {
          setShowViewer(false); // Don't show viewer until extraction starts
          setProgress({
            visible: false,
            pct: 0,
            label: "Ready",
            subLabel: "Click 'Start Extraction' to begin",
          });
        }
      } catch (err) {
        console.error("Session recovery failed:", err);
        // Clear potentially corrupted data
        try {
          clearExtractionPersist();
          localStorage.removeItem(STORAGE.SELECTED_FILE);
          localStorage.removeItem(STORAGE.EXTRACTION_JOB);
        } catch (clearErr) {
          console.error("Failed to clear corrupted data:", clearErr);
        }
      }
    };

    // FIXED: Add a small delay to ensure the component is fully mounted
    setTimeout(() => {
      recoverSession();
    }, 100);
  }, [startProgressTimer, startJobPolling]);

  // File selection handler
  const handleFileSelect = useCallback(
    (selectedFile, validationError) => {
      if (validationError) {
        setError(validationError);
        return;
      }

      console.log(
        "File selected:",
        selectedFile.name,
        "Size:",
        selectedFile.size
      );
      userSelectedNewFileRef.current = true;
      setError("");
      setFile(selectedFile);

      // Generate new selection ID for race condition prevention
      const selectionId = generateSelectionId();
      selectionIdRef.current = selectionId;

      // Clear previous results and stop any ongoing processes
      cleanup();
      clearExtractionPersist();
      setResult(null);
      setShowViewer(false);
      setProgress({
        visible: false,
        pct: 0,
        label: "Ready",
        subLabel: "Click 'Start Extraction' to begin",
      });

      // Only persist file metadata for session recovery, not the actual file data
      try {
        const fileMetadata = {
          name: selectedFile.name,
          size: selectedFile.size,
          type: selectedFile.type,
          selectedAt: Date.now(),
          selectionId,
          currentStep: 2,
          showViewer: false,
        };
        saveJSON(STORAGE.SELECTED_FILE, fileMetadata);
      } catch (err) {
        console.warn("Failed to persist file metadata:", err);
      }
    },
    [cleanup]
  );

  // Extraction starter
  const startExtraction = useCallback(async () => {
    if (!file || !destinationId) {
      setError("Missing file or destination");
      return;
    }

    // Check if this is a placeholder file (empty file created from metadata)
    const isPlaceholderFile = file.size === 0;

    if (isPlaceholderFile) {
      setError("Please reselect your file to start a new extraction");
      return;
    }

    console.log(
      "Starting extraction for:",
      file.name,
      "Size:",
      file.size,
      "Type:",
      file.type
    );

    // Generate job ID for tracking
    const jobId = generateSelectionId();
    currentJobIdRef.current = jobId;

    // Reset state
    setError("");
    setResult(null);
    setShowViewer(true);

    // Clear previous results
    clearExtractionPersist();

    // FIXED: Set initial progress state with visible = true
    setProgress({
      visible: true, // Make sure this is true from the start
      pct: 5,
      label: "Initializing...",
      subLabel: "Preparing your file for processing",
    });

    // Mark job as running with job ID
    saveJSON(STORAGE.EXTRACTION_JOB, {
      status: "running",
      startedAt: Date.now(),
      filename: file.name,
      fileSize: file.size,
      selectionId: selectionIdRef.current,
      jobId: jobId,
    });

    // Update file persistence with current status
    try {
      const existingFile = loadJSON(STORAGE.SELECTED_FILE) || {};
      saveJSON(STORAGE.SELECTED_FILE, {
        ...existingFile,
        currentStep: 3,
        showViewer: true,
        processingJobId: jobId,
      });
    } catch (err) {
      console.warn("Failed to update file persistence:", err);
    }

    // Start progress animation
    startProgressTimer();

    // Create abort controller
    abortControllerRef.current = new AbortController();

    try {
      // Update progress to show uploading
      setProgress((prev) => ({
        ...prev,
        pct: 10,
        label: "Uploading...",
        subLabel: "Sending your file to the server",
      }));

      const options = {
        extract_text: extractionOptions.extractText,
        extract_tables: extractionOptions.extractTables,
        extract_images: extractionOptions.extractImages,
        page_numbers: parsePageRange(extractionOptions.pageRange),
        destination_id: destinationId,
      };

      // Update progress to show processing started
      setTimeout(() => {
        if (isMountedRef.current && currentJobIdRef.current === jobId) {
          setProgress((prev) => ({
            ...prev,
            pct: Math.max(prev.pct, 30),
            label: "Processing...",
            subLabel: "AI is analyzing your document",
          }));
        }
      }, 1000);

      // Use the original file object directly - no reconstruction
      const response = await extractDocument({
        file,
        options,
        signal: abortControllerRef.current.signal,
      });

      // Normalize response format
      const data = response?.extraction_result
        ? response
        : response?.data?.extraction_result
        ? response.data
        : response?.data ?? response;

      console.log("Extraction completed successfully");

      // Persist result first (even if unmounted)
      persistExtractionResult(data);

      // Update UI only if still mounted and this is still the current job
      if (!isMountedRef.current || currentJobIdRef.current !== jobId) return;

      setResult(data);
      setProgress({
        visible: false,
        pct: 100,
        label: "Completed",
        subLabel: "Your file has been processed",
      });
    } catch (err) {
      console.error("Extraction failed:", err);

      // Persist failure
      saveJSON(STORAGE.EXTRACTION_JOB, {
        status: "failed",
        error: err?.message || String(err),
        failedAt: Date.now(),
        filename: file?.name,
        fileSize: file?.size,
        jobId: jobId,
      });

      // Update UI if still mounted and this is still the current job
      if (isMountedRef.current && currentJobIdRef.current === jobId) {
        const errorMessage =
          err?.name === "AbortError"
            ? "Extraction was cancelled"
            : err?.message || "Extraction failed";

        setError(errorMessage);
        setProgress({
          visible: false,
          pct: 0,
          label: "Failed",
          subLabel: "",
        });
      }
    } finally {
      stopProgressTimer();
      if (resumeTimerRef.current) {
        clearInterval(resumeTimerRef.current);
        resumeTimerRef.current = null;
      }
      abortControllerRef.current = null;
      if (currentJobIdRef.current === jobId) {
        currentJobIdRef.current = null;
      }
    }
  }, [
    file,
    destinationId,
    extractionOptions,
    startProgressTimer,
    stopProgressTimer,
    persistExtractionResult,
  ]);

  // Reset session
  const resetSession = useCallback(() => {
    console.log("Resetting session");
    cleanup();
    clearExtractionPersist();

    setFile(null);
    setResult(null);
    setError("");
    setShowViewer(false);
    setProgress({
      visible: false,
      pct: 0,
      label: "Ready",
      subLabel: "Select a file to begin",
    });

    localStorage.removeItem(STORAGE.SELECTED_FILE);
    localStorage.removeItem(STORAGE.EXTRACTION_JOB);
    localStorage.removeItem(STORAGE.EXTRACTION_PROGRESS); // Clear progress too
    selectionIdRef.current = null;
    currentJobIdRef.current = null;
    userSelectedNewFileRef.current = false; // FIXED: Reset this flag
  }, [cleanup]);

  // Update extraction options
  const updateExtractionOptions = useCallback((updates) => {
    setExtractionOptions((prev) => ({ ...prev, ...updates }));
  }, []);

  return {
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
  };
}

// Helper functions
function generateSelectionId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function parsePageRange(rangeStr) {
  if (!rangeStr?.trim()) return [];

  const parts = rangeStr
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const nums = [];

  for (const part of parts) {
    if (/^\d+$/.test(part)) {
      nums.push(Number(part));
    } else if (/^\d+\s*-\s*\d+$/.test(part)) {
      const [a, b] = part.split("-").map((s) => Number(s.trim()));
      const start = Math.min(a, b);
      const end = Math.max(a, b);
      for (let i = start; i <= end; i++) {
        nums.push(i);
      }
    }
  }

  return Array.from(new Set(nums)).sort((a, b) => a - b);
}
