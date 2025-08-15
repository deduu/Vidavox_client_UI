import React, { useEffect, useMemo, useState } from "react";
import DOMPurify from "dompurify";
import { marked } from "marked";

// OPTIONAL PDF.js: only if you want the Compare tab canvas rendering
let pdfjsLib = null;
const enablePdfPreview = true; // set false to disable PDF canvas preview

if (enablePdfPreview) {
  import("pdfjs-dist/build/pdf").then((m) => {
    pdfjsLib = m;
    // eslint-disable-next-line no-undef
    const workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;
  });
}

export default function ExtractResultsDrawer({ open, onClose, items }) {
  // items: [{ fileName, blobUrl?, // optional PDF blob url for compare tab
  //           result: { meta, json, markdown, pages, stats? } }]

  const [tab, setTab] = useState("summary"); // summary | compare | json | markdown | preview
  useEffect(() => {
    if (open) setTab("summary");
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      {/* Drawer */}
      <div className="ml-auto h-full w-full max-w-5xl bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b bg-gradient-to-r from-indigo-600/10 to-purple-600/10">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center">
              <span className="w-2 h-2 bg-purple-600 rounded-full mr-3" />
              Extraction Results
            </h3>
            <button
              className="px-3 py-1.5 text-sm rounded border hover:bg-gray-50"
              onClick={onClose}
            >
              Close
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            {items?.length || 0} file{items?.length === 1 ? "" : "s"}
          </p>
        </div>

        {/* Tabs */}
        <div className="border-b bg-white">
          <nav className="flex">
            {[
              ["summary", "Summary", "fa-chart-pie"],
              ["compare", "Compare", "fa-columns"],
              ["json", "JSON", "fa-code"],
              ["markdown", "Markdown", "fa-file-alt"],
              ["preview", "Preview", "fa-eye"],
            ].map(([key, label, icon]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex-1 py-3 px-4 text-sm font-semibold transition ${
                  tab === key
                    ? "text-blue-600 bg-blue-50"
                    : "text-gray-600 hover:text-blue-600 hover:bg-gray-50"
                }`}
              >
                <i className={`fas ${icon} mr-2`} />
                {label}
              </button>
            ))}
          </nav>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {tab === "summary" && <SummaryTab items={items} />}
          {tab === "compare" && (
            <CompareTab items={items} enablePdfPreview={enablePdfPreview} />
          )}
          {tab === "json" && <JsonTab items={items} />}
          {tab === "markdown" && <MarkdownTab items={items} />}
          {tab === "preview" && <PreviewTab items={items} />}
        </div>
      </div>
    </div>
  );
}

/* ---------- Tabs ---------- */

function SummaryTab({ items }) {
  const totals = useMemo(() => {
    const out = { pages: 0, textBlocks: 0, tables: 0, timeSec: 0 };
    for (const { result } of items) {
      const stats = result?.stats || {};
      out.pages += Number(stats.pages || result?.pages?.length || 0);
      out.textBlocks += Number(stats.text_blocks || 0);
      out.tables += Number(stats.tables || 0);
      out.timeSec += Number(stats.seconds || 0);
    }
    return out;
  }, [items]);

  return (
    <div className="space-y-6">
      {/* Overall cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          label="PAGES"
          value={totals.pages}
          icon="fa-file-alt"
          color="blue"
        />
        <StatCard
          label="TEXT"
          value={totals.textBlocks}
          icon="fa-paragraph"
          color="green"
        />
        <StatCard
          label="TABLES"
          value={totals.tables}
          icon="fa-table"
          color="purple"
        />
        <StatCard
          label="TIME"
          value={`${totals.timeSec || 0}s`}
          icon="fa-clock"
          color="yellow"
        />
      </div>

      {/* Per-file list */}
      <div className="bg-white rounded-xl border p-4">
        <div className="font-semibold mb-2">Files</div>
        <ul className="space-y-2">
          {items.map(({ fileName, result }, idx) => (
            <li
              key={`${fileName}-${idx}`}
              className="flex items-center justify-between"
            >
              <span className="truncate">{fileName}</span>
              <span className="text-xs text-gray-500">
                {result?.pages?.length || 0} page(s)
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Downloads */}
      <div className="bg-white rounded-xl border p-4">
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() =>
              download(
                "results.json",
                JSON.stringify(
                  items.map((i) => i.result?.json ?? {}),
                  null,
                  2
                )
              )
            }
            className="px-4 py-2 rounded-lg text-white bg-blue-600 hover:bg-blue-700"
          >
            <i className="fas fa-code mr-2" /> Download JSON
          </button>
          <button
            onClick={() =>
              download(
                "results.md",
                items.map((i) => i.result?.markdown ?? "").join("\n\n---\n\n")
              )
            }
            className="px-4 py-2 rounded-lg text-white bg-green-600 hover:bg-green-700"
          >
            <i className="fas fa-file-alt mr-2" /> Download Markdown
          </button>
        </div>
      </div>
    </div>
  );
}

function CompareTab({ items, enablePdfPreview }) {
  // Render first file only for simplicity (you can expand to a per-file selector)
  const item = items?.[0];
  if (!item) return <EmptyState text="No content to compare" />;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Original PDF */}
      <div className="bg-white rounded-xl border p-4">
        <h4 className="font-semibold mb-3 flex items-center">
          <i className="fas fa-file-pdf text-red-500 mr-2" /> Original PDF Page
        </h4>
        <PdfPreview blobUrl={item.blobUrl} enable={enablePdfPreview} />
      </div>

      {/* Extracted */}
      <div className="bg-white rounded-xl border p-4">
        <h4 className="font-semibold mb-3 flex items-center">
          <i className="fas fa-file-alt text-green-500 mr-2" /> Extracted
          Content
        </h4>
        <div className="prose max-w-none">
          {item.result?.markdown ? (
            <div
              className="markdown-content"
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(marked.parse(item.result.markdown)),
              }}
            />
          ) : (
            <EmptyState text="No extracted content" />
          )}
        </div>
      </div>
    </div>
  );
}

function PdfPreview({ blobUrl, enable }) {
  const [canvasRef, setCanvasRef] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!enable || !blobUrl || !canvasRef || !pdfjsLib) return;
    let cancelled = false;

    (async () => {
      try {
        const pdf = await pdfjsLib.getDocument(blobUrl).promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 1.2 });
        const canvas = canvasRef;
        const ctx = canvas.getContext("2d");
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        await page.render({ canvasContext: ctx, viewport }).promise;
      } catch (e) {
        if (!cancelled) setError(e.message || "Failed to render PDF");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [blobUrl, canvasRef, enable]);

  if (!blobUrl) return <EmptyState text="No PDF available" />;
  if (!enable)
    return (
      <div className="p-6 bg-gray-50 rounded-lg text-gray-600 text-sm">
        PDF preview disabled.
      </div>
    );

  return (
    <div className="flex justify-center">
      <canvas ref={setCanvasRef} className="shadow rounded" />
      {error && <div className="text-sm text-red-600 mt-2">{error}</div>}
    </div>
  );
}

function JsonTab({ items }) {
  const jsonPretty = useMemo(
    () =>
      JSON.stringify(
        items.map((i) => i.result?.json ?? {}),
        null,
        2
      ),
    [items]
  );
  return (
    <div className="bg-white rounded-xl border overflow-hidden">
      <pre className="p-4 text-xs overflow-auto">{jsonPretty}</pre>
    </div>
  );
}

function MarkdownTab({ items }) {
  const md = useMemo(
    () => items.map((i) => i.result?.markdown ?? "").join("\n\n---\n\n"),
    [items]
  );
  return (
    <div className="bg-white rounded-xl border overflow-hidden">
      <pre className="p-4 text-sm overflow-auto">
        {md || "Markdown content will appear here..."}
      </pre>
    </div>
  );
}

function PreviewTab({ items }) {
  const md = useMemo(
    () => items.map((i) => i.result?.markdown ?? "").join("\n\n---\n\n"),
    [items]
  );
  const html = useMemo(() => DOMPurify.sanitize(marked.parse(md || "")), [md]);
  return (
    <div className="bg-white rounded-xl border overflow-hidden">
      <div
        className="p-6 prose prose-lg max-w-none"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}

/* ---------- helpers ---------- */
function StatCard({ label, value, icon, color }) {
  const colorMap = {
    blue: "bg-blue-100 text-blue-600",
    green: "bg-green-100 text-green-600",
    purple: "bg-purple-100 text-purple-600",
    yellow: "bg-yellow-100 text-yellow-600",
  };
  return (
    <div className="bg-white p-5 rounded-xl border">
      <div className="flex items-center justify-between mb-2">
        <div className={`p-3 rounded-xl ${colorMap[color]}`}>
          <i className={`fas ${icon}`} />
        </div>
        <span className="text-xs text-gray-500 font-medium">{label}</span>
      </div>
      <div className="text-2xl font-bold text-gray-800">{value}</div>
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div className="text-center py-8 text-gray-500">
      <i className="fas fa-info-circle text-2xl mb-2" />
      <div className="text-sm">{text}</div>
    </div>
  );
}

function download(filename, text) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
