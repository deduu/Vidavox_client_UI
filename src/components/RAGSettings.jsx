import React from "react";
import { HelpCircle } from "lucide-react";
import TooltipWrapper from "./TooltipWrapper";

export default function RAGSettings({
  topK,
  threshold,
  onTopKChange,
  onThresholdChange,
  activePreset,
  setActivePreset,
  disabled = false,
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-700">
          RAG Settings
        </label>
        <TooltipWrapper content="Minimum similarity score (0.0-1.0)">
          <HelpCircle size={12} className="text-gray-400 cursor-help" />
        </TooltipWrapper>
      </div>

      <div className="flex items-center gap-4">
        {/* Top K Input */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-gray-600">Top K</label>
            <TooltipWrapper content="Number of similar chunks to retrieve (1-50)">
              <HelpCircle size={12} className="text-gray-400 cursor-help" />
            </TooltipWrapper>
          </div>
          <input
            type="number"
            min={1}
            max={50}
            step={1}
            className="border border-gray-300 rounded-md px-2 py-1 text-sm w-16 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
            value={topK}
            onChange={(e) => onTopKChange(Number(e.target.value))}
            disabled={disabled}
          />
        </div>

        {/* Threshold Input */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-gray-600">
              Threshold
            </label>
            <TooltipWrapper content="Minimum similarity score (0.0-1.0)">
              <HelpCircle size={16} className="text-gray-400 cursor-help" />
            </TooltipWrapper>
          </div>
          <input
            type="number"
            min={0}
            max={1}
            step={0.01}
            className="border border-gray-300 rounded-md px-2 py-1 text-sm w-20 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
            value={threshold}
            onChange={(e) => onThresholdChange(parseFloat(e.target.value))}
            disabled={disabled}
          />
        </div>

        {/* Quick Presets */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Presets</label>
          <div className="flex gap-1">
            <button
              onClick={() => {
                onTopKChange(5);
                onThresholdChange(0.3);
                setActivePreset("precise");
              }}
              className={`px-2 py-1 text-xs border rounded
    ${
      activePreset === "precise"
        ? "bg-blue-500 text-white border-blue-600"
        : "bg-white hover:bg-gray-50 border-gray-300"
    }
    focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500`}
              disabled={disabled}
            >
              Precise
            </button>

            <button
              onClick={() => {
                onTopKChange(10);
                onThresholdChange(0.2);
                setActivePreset("balanced");
              }}
              className={`px-2 py-1 text-xs border rounded
    ${
      activePreset === "balanced"
        ? "bg-blue-500 text-white border-blue-600"
        : "bg-white hover:bg-gray-50 border-gray-300"
    }
    focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500`}
              disabled={disabled}
            >
              Balanced
            </button>
            <button
              onClick={() => {
                onTopKChange(20);
                onThresholdChange(0.1);
                setActivePreset("broad");
              }}
              className={`px-2 py-1 text-xs border rounded
    ${
      activePreset === "broad"
        ? "bg-blue-500 text-white border-blue-600"
        : "bg-white hover:bg-gray-50 border-gray-300"
    }
    focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500`}
              disabled={disabled}
            >
              Broad
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
