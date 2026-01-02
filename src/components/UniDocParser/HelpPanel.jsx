// src/components/UniDocParser/HelpPanel.jsx
import React from "react";
import { THEME } from "../../constants/theme";

export default function HelpPanel() {
  return (
    <div
      className={`${THEME.glass} rounded-xl shadow-sm overflow-hidden h-full min-h-[720px] flex flex-col`}
    >
      {/* Header */}
      <div className="px-6 py-4 text-gray-800 bg-gradient-to-r from-indigo-50/80 to-purple-50/80 border-b border-gray-100/60">
        <h2 className="text-2xl font-bold flex items-center">
          <span className="mr-3">❓</span>
          How to use UniDocParser
        </h2>
        <p className="text-gray-600 mt-1">
          Follow these simple steps to extract content from your documents
        </p>
      </div>

      {/* Content */}
      <div className="p-8 flex-1 overflow-auto">
        <div className="space-y-6">
          <HelpStep n={1} tone="blue" title="Upload Your File">
            Drag & drop your file into the upload zone, or click to browse.
          </HelpStep>

          <HelpStep n={2} tone="green" title="Configure Extraction Settings">
            Choose what to extract (text, tables, images) and optionally set
            page ranges.
          </HelpStep>

          <HelpStep n={3} tone="purple" title="Review & Compare">
            Validate accuracy by comparing original pages and extracted content.
          </HelpStep>

          <HelpStep n={4} tone="yellow" title="Download Results">
            Export JSON or Markdown for use in your apps or docs.
          </HelpStep>
        </div>

        {/* Pro Tips Section */}
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
                  Use high-quality PDFs with clear text and well-structured
                  tables.
                </li>
                <li>Limit to specific page ranges to speed up processing.</li>
                <li>Use Preview to see how content renders in HTML.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 bg-white/60 text-center text-sm text-gray-500 border-t border-white/40">
        © {new Date().getFullYear()} Vidavox Doc AI. All rights reserved.
      </div>
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
