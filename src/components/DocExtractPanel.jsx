// src/components/PdfExtractPanel.jsx
import React, { useMemo, useState } from "react";
import FileUpload from "./FileUpload";
import { extractPdf } from "../services/api";

export default function DocExtractPanel({ folderId, onDone }) {
  const [pickedFile, setPickedFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const [extractText, setExtractText] = useState(true);
  const [extractTables, setExtractTables] = useState(true);
  const [extractImages, setExtractImages] = useState(false);
  const [pageRange, setPageRange] = useState("");

  const pageNumbers = useMemo(() => {
    if (!pageRange.trim()) return [];
    const out = new Set();
    for (const chunk of pageRange.split(",").map((s) => s.trim())) {
      if (!chunk) continue;
      const m = chunk.match(/^(\d+)\s*-\s*(\d+)$/);
      if (m) {
        let a = +m[1],
          b = +m[2];
        if (a > b) [a, b] = [b, a];
        for (let i = a; i <= b; i++) out.add(i);
      } else if (/^\d+$/.test(chunk)) {
        out.add(+chunk);
      }
    }
    return [...out].sort((a, b) => a - b);
  }, [pageRange]);

  async function run() {
    if (!pickedFile) {
      setErr("Pick a file first.");
      return;
    }
    setErr("");
    setBusy(true);
    try {
      const res = await extractPdf({
        file: pickedFile,
        folderId,
        options: {
          extract_text: extractText,
          extract_tables: extractTables,
          extract_images: extractImages,
          page_numbers: pageNumbers,
        },
      });
      onDone?.(res); // Let parent decide what to do with result (e.g., open a results drawer)
    } catch (e) {
      setErr(e.message || "Extraction failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
        <div className="font-medium text-emerald-900">Extraction Workspace</div>
        <p className="text-emerald-800 text-sm">
          Pick a file (no upload yet), configure options, then run extraction.
        </p>
      </div>

      {/* Reuse FileUpload as a picker */}
      <FileUpload
        pickOnly
        folderId={folderId}
        onPick={(file) => setPickedFile(file)}
      />

      {/* Settings */}
      <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
        <div className="font-semibold text-gray-800 mb-3">
          Extraction Settings
        </div>
        <div className="space-y-3">
          <Toggle
            label="Extract Text"
            checked={extractText}
            onChange={setExtractText}
          />
          <Toggle
            label="Extract Tables"
            checked={extractTables}
            onChange={setExtractTables}
          />
          <Toggle
            label="Extract Images"
            checked={extractImages}
            onChange={setExtractImages}
          />
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Page Range (optional)
          </label>
          <input
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="e.g., 1-3, 5, 7-8"
            value={pageRange}
            onChange={(e) => setPageRange(e.target.value)}
          />
          {pageNumbers.length > 0 && (
            <p className="text-xs text-gray-500 mt-1">
              Parsed:{" "}
              <span className="font-medium">{pageNumbers.join(", ")}</span>
            </p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={run}
          disabled={busy || !pickedFile}
          className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg shadow disabled:opacity-60"
        >
          <i className="fas fa-magic mr-2" />
          {busy ? "Working..." : "Run Extraction"}
        </button>
        {pickedFile && (
          <span className="text-sm text-gray-600">
            Selected: <span className="font-medium">{pickedFile.name}</span>
          </span>
        )}
      </div>

      {err && (
        <div className="p-3 rounded-lg bg-red-50 text-red-700 border border-red-200">
          <i className="fas fa-exclamation-triangle mr-2" />
          {err}
        </div>
      )}
    </div>
  );
}

function Toggle({ label, checked, onChange }) {
  return (
    <label className="flex items-center justify-between p-3 bg-white rounded-lg border">
      <span className="font-medium text-gray-800">{label}</span>
      <span className="relative inline-flex items-center">
        <input
          type="checkbox"
          className="sr-only peer"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="w-11 h-6 bg-gray-200 rounded-full peer-checked:bg-blue-600 transition-colors relative">
          <span className="absolute top-[2px] left-[2px] h-5 w-5 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5" />
        </span>
      </span>
    </label>
  );
}
