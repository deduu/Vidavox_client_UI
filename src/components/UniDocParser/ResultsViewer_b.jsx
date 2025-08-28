// src/components/UniDocParser/ResultsViewer.jsx
import React, { useState, useMemo } from "react";
import { THEME } from "../../constants/theme";
import { useClipboard } from "../../hooks/useClipboard";
import {
  calculateStats,
  formatBytes,
  buildJsonStringFromResult,
  buildMarkdownFromPages,
} from "../../utils/extraction";
import { downloadFile } from "../../utils/download";
import { renderMarkdownAdv } from "../../utils/renderMarkdownAdv";

// Import your existing components (these would need to be refactored similarly)
import ExtractedPageViewer from "../ExtractedPageViewer";
import JsonEditorViewer from "../JsonEditorViewer";
import PageAnnotator from "./PageAnnotator"; // adjust path if needed

const TABS = [
  { id: "summary", label: "Summary", icon: "📊" },
  { id: "comparison", label: "Compare", icon: "🧱" },
  { id: "json", label: "JSON", icon: "🧩" },
  { id: "markdown", label: "Markdown", icon: "📄" },
  { id: "preview", label: "Preview", icon: "👁️" },
];

export default function ResultsViewer({
  file,
  result,
  isCompleted,
  extractionOptions,
  activeTab,
  onTabChange,
}) {
  const { copyToClipboard } = useClipboard();

  // JSON viewer controls
  const [expandAllJson, setExpandAllJson] = useState(false);
  const [collapseAllJson, setCollapseAllJson] = useState(false);

  // Memoized computations
  const stats = useMemo(() => {
    return result?.extraction_result
      ? calculateStats(result.extraction_result)
      : {
          pages: 0,
          textBlocks: 0,
          tables: 0,
          time: "—",
        };
  }, [result]);

  const jsonText = useMemo(() => {
    const stored = localStorage.getItem("JSON_TEXT");
    if (stored) return stored;

    return result?.extraction_result
      ? buildJsonStringFromResult(result.extraction_result)
      : "";
  }, [result]);

  const markdownText = useMemo(() => {
    const stored = localStorage.getItem("MARKDOWN_TEXT");
    if (stored) return stored;

    return result?.extraction_result?.pages
      ? buildMarkdownFromPages(result.extraction_result.pages)
      : "";
  }, [result]);

  // Event handlers
  const handleJsonDownload = () => {
    if (jsonText) {
      const success = downloadFile(
        jsonText,
        `${file?.name || "result"}.json`,
        "application/json"
      );
      if (!success) {
        alert("Download failed. Please try again.");
      }
    }
  };

  const handleMarkdownDownload = () => {
    if (markdownText) {
      const success = downloadFile(
        markdownText,
        `${file?.name || "result"}.md`,
        "text/markdown"
      );
      if (!success) {
        alert("Download failed. Please try again.");
      }
    }
  };

  const handleJsonCopy = () => {
    copyToClipboard(jsonText, "JSON copied to clipboard!");
  };

  const handleMarkdownCopy = () => {
    copyToClipboard(markdownText, "Markdown copied to clipboard!");
  };

  const handleExpandAll = () => {
    setCollapseAllJson(false);
    setExpandAllJson(true);
    setTimeout(() => setExpandAllJson(false), 0);
  };

  const handleCollapseAll = () => {
    setExpandAllJson(false);
    setCollapseAllJson(true);
    setTimeout(() => setCollapseAllJson(false), 0);
  };

  return (
    <div
      className={`${THEME.glass} rounded-xl shadow-sm overflow-hidden h-full min-h-[720px] flex flex-col`}
    >
      {/* Tabs Header */}
      <div className={THEME.softBar}>
        <nav className="flex flex-wrap" aria-label="Tabs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`
                flex-1 py-4 px-6 font-semibold text-center transition-all
                ${
                  activeTab === tab.id
                    ? "text-blue-600 bg-blue-50"
                    : "text-gray-600 hover:text-blue-600 hover:bg-gray-50"
                }
              `}
            >
              <span className="mr-2">{tab.icon}</span>
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="p-8 flex-1 overflow-auto">
        {activeTab === "summary" && (
          <SummaryTab
            file={file}
            stats={stats}
            isCompleted={isCompleted}
            onJsonDownload={handleJsonDownload}
            onMarkdownDownload={handleMarkdownDownload}
          />
        )}

        {activeTab === "comparison" && (
          <ComparisonTab
            result={result}
            extractionOptions={extractionOptions}
          />
        )}

        {activeTab === "json" && (
          <JsonTab
            jsonText={jsonText}
            result={result}
            onCopy={handleJsonCopy}
            expandAll={expandAllJson}
            collapseAll={collapseAllJson}
            onExpandAll={handleExpandAll}
            onCollapseAll={handleCollapseAll}
          />
        )}

        {activeTab === "markdown" && (
          <MarkdownTab
            markdownText={markdownText}
            result={result}
            onCopy={handleMarkdownCopy}
          />
        )}

        {activeTab === "preview" && (
          <PreviewTab markdownText={markdownText} result={result} />
        )}
      </div>
    </div>
  );
}

// Tab Components
function SummaryTab({
  file,
  stats,
  isCompleted,
  onJsonDownload,
  onMarkdownDownload,
}) {
  return (
    <div className="space-y-8">
      {/* File Info Card */}
      {file && (
        <div className="bg-white rounded-xl shadow p-4 flex items-center space-x-4 border border-gray-100">
          <div className="flex-shrink-0 text-red-500 text-4xl">📄</div>
          <div className="flex-grow">
            <h3 className="text-xl font-bold text-gray-800">{file.name}</h3>
            <p className="text-sm text-gray-600">
              {stats.pages} pages • {formatBytes(file.size)}
            </p>
            <div className="mt-2 text-sm font-semibold px-3 py-1 rounded-full inline-flex items-center space-x-2 bg-blue-50 text-blue-700">
              <span>{isCompleted ? "Completed" : "Processing..."}</span>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard label="PAGES" value={stats.pages} icon="📄" tone="blue" />
        <StatCard
          label="TEXT"
          value={stats.textBlocks}
          icon="🅰️"
          tone="green"
        />
        <StatCard label="TABLES" value={stats.tables} icon="📊" tone="purple" />
        <StatCard label="TIME" value={stats.time} icon="⏱️" tone="yellow" />
      </div>

      {/* Downloads */}
      <div className="bg-white p-6 rounded-xl shadow border border-gray-100">
        <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <span className="mr-3 text-blue-600">⬇️</span>
          Download Results
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={onJsonDownload}
            className={`flex items-center justify-center space-x-3 ${THEME.primaryBtn} font-semibold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-[1.02] shadow-sm hover:shadow-md`}
          >
            <span>🧩</span>
            <span>JSON Format</span>
          </button>
          <button
            onClick={onMarkdownDownload}
            className="flex items-center justify-center space-x-3 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-[1.02] shadow-sm hover:shadow-md"
          >
            <span>📄</span>
            <span>Markdown</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function ComparisonTab({ result, extractionOptions }) {
  if (!result?.extraction_result?.pages) {
    return <EmptyState icon="🧱" text="No pages available for comparison" />;
  }

  return (
    <ExtractedPageViewer
      pages={result.extraction_result.pages}
      showImages={extractionOptions.extractImages}
      previewHeight={1024}
    />
  );
}

function JsonTab({
  jsonText,
  result,
  onCopy,
  expandAll,
  collapseAll,
  onExpandAll,
  onCollapseAll,
}) {
  const parsedJson = useMemo(() => {
    if (jsonText) {
      try {
        return JSON.parse(jsonText);
      } catch {}
    }

    // Fallback: derive from result
    const extraction = result?.extraction_result;
    if (extraction) {
      try {
        return JSON.parse(buildJsonStringFromResult(extraction));
      } catch {}
    }

    return null;
  }, [jsonText, result]);

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="bg-white p-4 rounded-xl shadow mb-6 border border-gray-100">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center">
            <span className="mr-2 text-blue-600">🧩</span>
            JSON Output
          </h3>
          <div className="flex space-x-2">
            <button
              onClick={onCopy}
              className={`px-4 py-2 ${THEME.primaryBtn} rounded-lg inline-flex items-center space-x-2 font-medium`}
            >
              Copy
            </button>
            <button
              onClick={onExpandAll}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium"
            >
              Expand All
            </button>
            <button
              onClick={onCollapseAll}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium"
            >
              Collapse All
            </button>
          </div>
        </div>
      </div>

      {/* JSON Content */}
      <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
        <div
          className="p-6 overflow-x-auto"
          style={{ minHeight: 400, maxHeight: 600 }}
        >
          {parsedJson ? (
            <JsonEditorViewer
              json={parsedJson}
              expandAll={expandAll}
              collapseAll={collapseAll}
            />
          ) : (
            <EmptyState icon="🧩" text="No JSON data available" />
          )}
        </div>
      </div>
    </div>
  );
}

function MarkdownTab({ markdownText, result, onCopy }) {
  const content =
    markdownText ||
    buildMarkdownFromPages(result?.extraction_result?.pages) ||
    "# Markdown content will appear here...";

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="bg-white p-4 rounded-xl shadow mb-6 border border-gray-100">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center">
            <span className="mr-2 text-emerald-600">📄</span>
            Markdown Source
          </h3>
          <button
            onClick={onCopy}
            className={`px-4 py-2 ${THEME.primaryBtn} rounded-lg inline-flex items-center space-x-2 font-medium`}
          >
            Copy
          </button>
        </div>
      </div>

      {/* Markdown Content */}
      <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
        <div className="p-6 overflow-x-auto" style={{ maxHeight: 600 }}>
          <pre className="bg-gray-50 rounded-lg p-4 text-sm whitespace-pre-wrap">
            {content}
          </pre>
        </div>
      </div>
    </div>
  );
}

function PreviewTab({ markdownText, result }) {
  const content =
    markdownText ||
    buildMarkdownFromPages(result?.extraction_result?.pages) ||
    "";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-4 rounded-xl shadow mb-6 border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center">
          <span className="mr-2 text-purple-600">👁️</span>
          Rendered Preview
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          How your extracted content will look when rendered
        </p>
      </div>

      {/* Preview Content */}
      <div
        className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden"
        style={{ maxHeight: 600, overflowY: "auto" }}
      >
        {content ? (
          <div
            className="p-8 prose max-w-none"
            dangerouslySetInnerHTML={{
              __html: renderMarkdownAdv(content),
            }}
          />
        ) : (
          <div className="text-center py-12 text-gray-500">
            <div className="text-4xl mb-4">👁️</div>
            <p className="text-lg">Preview will appear here</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Utility Components
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

function EmptyState({ icon = "ℹ️", text = "Nothing to show" }) {
  return (
    <div className="flex flex-col items-center justify-center text-gray-400 py-12">
      <div className="text-4xl mb-2">{icon}</div>
      <div className="text-sm">{text}</div>
    </div>
  );
}
